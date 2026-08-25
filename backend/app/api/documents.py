import os
import uuid
import hashlib
import shutil
import zipfile
import tempfile
from typing import List, Optional

from pydantic import BaseModel
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    BackgroundTasks,
    Query,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.session import get_db, SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.models.collection import Collection
from app.models.user import User

from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    CollectionResponse,
    CollectionCreate,
    BatchUploadResponse,
    BatchUploadItem,
)

from app.services.pdf_service import PDFExtractionService, calculate_sha256
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import get_embedding_provider

from app.api.deps import get_current_user_optional, rate_limiter
from app.core.config import settings
from app.core.logging import logger


router = APIRouter()


# ============================================================
# PATH HELPERS
# ============================================================

def get_upload_directory() -> str:
    """
    Always resolve the configured upload directory to an
    absolute physical directory with automatic /tmp fallback on cloud containers.
    """
    try:
        upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(upload_dir, exist_ok=True)
        test_file = os.path.join(upload_dir, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        if os.path.exists(test_file):
            os.remove(test_file)
        return upload_dir
    except Exception as e:
        logger.warning(f"[UPLOAD] Standard upload_dir ({settings.UPLOAD_DIR}) inaccessible: {e}. Falling back to system temp.")
        fallback_dir = os.path.join(tempfile.gettempdir(), "archer_uploads")
        os.makedirs(fallback_dir, exist_ok=True)
        return fallback_dir


def resolve_document_path(file_path: Optional[str]) -> Optional[str]:
    """
    Resolve a document path safely across Windows/local environments.

    The database may contain:
        absolute Windows path
        relative ./uploads path
        filename only

    This function tries all sensible locations.
    """

    if not file_path:
        return None

    upload_dir = get_upload_directory()

    candidates = []

    # Original path
    candidates.append(file_path)

    # Absolute version
    candidates.append(os.path.abspath(file_path))

    # Same basename inside backend/uploads
    basename = os.path.basename(file_path)
    if basename:
        candidates.append(os.path.join(upload_dir, basename))

    # Filename-only fallback
    candidates.append(os.path.join(upload_dir, os.path.basename(file_path)))

    # Legacy/project upload locations
    base_dir = os.path.dirname(os.path.abspath(__file__))

    for relative_dir in [
        "../../../uploads",
        "../../uploads",
        "../uploads",
        "uploads",
    ]:
        candidates.append(
            os.path.abspath(
                os.path.join(
                    base_dir,
                    relative_dir,
                    os.path.basename(file_path),
                )
            )
        )

    seen = set()

    for candidate in candidates:
        if not candidate:
            continue

        candidate = os.path.abspath(candidate)

        if candidate in seen:
            continue

        seen.add(candidate)

        if os.path.isfile(candidate):
            return candidate

    return None


# ============================================================
# PDF INGESTION WORKER
# ============================================================

def process_pdf_background(document_id: str, file_path: str):
    """
    Background ingestion pipeline with detailed timing observability:
        UPLOADED -> PROCESSING -> INDEXING -> READY
    """
    import time
    t_start = time.time()
    db: Session = SessionLocal()
    doc = None

    try:
        logger.info(f"[INGESTION] Starting document processing: document_id={document_id}")

        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"[INGESTION] Document {document_id} not found in database.")
            return

        resolved_path = resolve_document_path(file_path)
        if not resolved_path:
            error_message = f"PDF source file not found on disk. Original path: {file_path}"
            logger.error(f"[INGESTION] {error_message}")
            doc.status = DocumentStatus.FAILED.value
            doc.error_message = error_message
            db.commit()
            return

        logger.info(f"[INGESTION] Physical PDF located: {resolved_path}")
        doc.file_url = resolved_path
        doc.status = DocumentStatus.PROCESSING.value
        doc.error_message = None
        db.commit()

        # STEP 1: PDF EXTRACTION
        t0 = time.time()
        logger.info(f"[INGESTION] PDF_EXTRACTION_STARTED: {doc.title} ({doc.id})")
        extracted_data = PDFExtractionService.extract_pdf(resolved_path)
        t_extract = (time.time() - t0) * 1000

        if not extracted_data:
            raise RuntimeError("PDF extraction returned no data.")

        page_count = extracted_data.get("page_count", 0)
        pages = extracted_data.get("pages", [])
        logger.info(f"[INGESTION] PDF_EXTRACTION_FINISHED: pages={page_count}, elapsed={t_extract:.1f}ms")

        extracted_title = extracted_data.get("title")
        if extracted_title:
            doc.title = extracted_title
        if extracted_data.get("authors") and not doc.authors:
            doc.authors = extracted_data["authors"]
        if extracted_data.get("abstract"):
            doc.abstract = extracted_data["abstract"]
        if extracted_data.get("year"):
            doc.year = extracted_data["year"]
        if extracted_data.get("doi"):
            doc.doi = extracted_data["doi"]
        doc.page_count = page_count

        # STEP 2: CHUNKING
        doc.status = DocumentStatus.INDEXING.value
        db.commit()

        t0 = time.time()
        logger.info(f"[INGESTION] CHUNKING_STARTED: {doc.title} ({doc.id})")
        chunker = ChunkingService()
        raw_chunks = chunker.chunk_document(str(doc.id), pages)
        t_chunk = (time.time() - t0) * 1000
        logger.info(f"[INGESTION] CHUNKING_FINISHED: chunks={len(raw_chunks)}, elapsed={t_chunk:.1f}ms")

        if not raw_chunks:
            raw_chunks = [{
                "document_id": str(doc.id),
                "chunk_index": 0,
                "page_number": 1,
                "section": "General",
                "content": f"Document: {doc.title}",
                "token_count": 10,
            }]

        # STEP 3: EMBEDDINGS
        t0 = time.time()
        logger.info(f"[INGESTION] EMBEDDING_STARTED: {len(raw_chunks)} chunks for {doc.title}")
        embed_provider = get_embedding_provider()
        chunk_texts = [chunk["content"] for chunk in raw_chunks]
        embeddings = embed_provider.embed_documents(chunk_texts, batch_size=32)
        t_embed = (time.time() - t0) * 1000
        logger.info(f"[INGESTION] EMBEDDING_FINISHED: generated {len(embeddings)} vectors, elapsed={t_embed:.1f}ms")

        # STEP 4: DATABASE CHUNK INSERT
        t0 = time.time()
        logger.info(f"[INGESTION] CHUNK_DB_INSERT_STARTED: inserting {len(raw_chunks)} chunks into pgvector")
        db.query(Chunk).filter(Chunk.document_id == str(doc.id)).delete()
        db.commit()

        chunk_mappings = []
        for index, chunk_data in enumerate(raw_chunks):
            embedding = embeddings[index] if index < len(embeddings) else None
            chunk_mappings.append({
                "id": str(uuid.uuid4()),
                "document_id": str(doc.id),
                "chunk_index": chunk_data["chunk_index"],
                "page_number": chunk_data["page_number"],
                "section": chunk_data["section"],
                "content": chunk_data["content"],
                "token_count": chunk_data["token_count"],
                "embedding": embedding,
            })

        batch_size_db = 500
        for start in range(0, len(chunk_mappings), batch_size_db):
            batch = chunk_mappings[start:start + batch_size_db]
            db.bulk_insert_mappings(Chunk, batch)
            db.flush()

        t_db = (time.time() - t0) * 1000
        doc.status = DocumentStatus.READY.value
        doc.error_message = None
        db.commit()

        t_total = time.time() - t_start
        logger.info(
            f"[INGESTION][TIMING] document_id={document_id} extraction={t_extract:.1f}ms chunking={t_chunk:.1f}ms embedding={t_embed:.1f}ms db_insert={t_db:.1f}ms total={t_total:.2f}s chunks={len(chunk_mappings)}"
        )
        logger.info(f"[INGESTION] DOCUMENT_READY: {doc.title} ({doc.id}) pages={doc.page_count} chunks={len(chunk_mappings)}")

    except Exception as e:
        logger.error(f"[INGESTION] FAILED for {document_id}: {str(e)}", exc_info=True)
        try:
            db.rollback()
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = DocumentStatus.FAILED.value
                doc.error_message = str(e)
                db.commit()
        except Exception as db_error:
            logger.error(f"[INGESTION] Could not save failure state: {db_error}", exc_info=True)
    finally:
        db.close()
        logger.info(f"[INGESTION] Worker finished: {document_id}")


# ============================================================
# UPLOAD DOCUMENTS
# ============================================================

@router.post(
    "/documents/upload",
    response_model=List[DocumentResponse],
)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    collection_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    """
    Upload endpoint.

    IMPORTANT:

    This endpoint ONLY:

        1. Saves PDF
        2. Creates DB record
        3. Queues ingestion
        4. Returns

    It does NOT perform PDF extraction or embeddings
    during the HTTP request.

    This prevents the frontend upload request from getting
    stuck at 35%.
    """

    if not files:
        raise HTTPException(
            status_code=400,
            detail="No files provided.",
        )

    upload_dir = get_upload_directory()

    clean_collection_id = (
        collection_id.strip()
        if (
            collection_id
            and collection_id.strip()
            and collection_id
            not in ["undefined", "null"]
        )
        else None
    )

    user_id = (
        current_user.id
        if current_user
        else None
    )

    responses: List[DocumentResponse] = []

    for file in files:

        filename = file.filename or "unknown.pdf"

        if not filename.lower().endswith(".pdf"):

            logger.warning(
                f"[UPLOAD] Skipping non-PDF: "
                f"{filename}"
            )

            continue

        temp_path = None

        try:

            logger.info(
                f"[UPLOAD] Receiving file: "
                f"{filename}"
            )

            # ------------------------------------------------
            # SAVE TEMPORARY FILE
            # ------------------------------------------------

            hasher = hashlib.sha256()

            temp_filename = (
                f"temp_"
                f"{uuid.uuid4().hex}_"
                f"{os.path.basename(filename)}"
            )

            temp_path = os.path.join(
                upload_dir,
                temp_filename,
            )

            file_size = 0

            with open(
                temp_path,
                "wb",
            ) as buffer:

                while True:

                    chunk = await file.read(
                        2 * 1024 * 1024
                    )

                    if not chunk:
                        break

                    hasher.update(chunk)
                    buffer.write(chunk)

                    file_size += len(chunk)

            logger.info(
                f"[UPLOAD] File saved temporarily: "
                f"{filename}, "
                f"{file_size} bytes"
            )

            # ------------------------------------------------
            # EMPTY FILE CHECK
            # ------------------------------------------------

            if file_size == 0:

                if (
                    temp_path
                    and os.path.exists(temp_path)
                ):
                    os.remove(temp_path)

                logger.warning(
                    f"[UPLOAD] Empty PDF: "
                    f"{filename}"
                )

                continue

            # ------------------------------------------------
            # HASH
            # ------------------------------------------------

            content_hash = hasher.hexdigest()

            # ------------------------------------------------
            # DUPLICATE CHECK
            # ------------------------------------------------

            existing_doc = (
                db.query(Document)
                .filter(
                    Document.content_hash
                    == content_hash
                )
                .first()
            )

            if existing_doc:
                existing_chunks_count = (
                    db.query(Chunk)
                    .filter(Chunk.document_id == existing_doc.id)
                    .count()
                )

                if (
                    existing_doc.status == DocumentStatus.READY.value
                    and existing_chunks_count > 0
                ):
                    if temp_path and os.path.exists(temp_path):
                        os.remove(temp_path)

                    logger.info(
                        f"[UPLOAD] Duplicate detected and already READY: "
                        f"{filename} (id={existing_doc.id}, chunks={existing_chunks_count})"
                    )

                    resp = DocumentResponse.model_validate(existing_doc)
                    resp.is_duplicate = True
                    resp.chunks_count = existing_chunks_count
                    resp.stage = "READY"
                    responses.append(resp)
                    continue
                else:
                    logger.info(
                        f"[UPLOAD] Duplicate detected but incomplete/failed ({existing_doc.status}). Re-queuing ingestion..."
                    )
                    safe_original_name = os.path.basename(filename).replace(" ", "_")
                    safe_filename = f"{content_hash[:12]}_{safe_original_name}"
                    file_path = os.path.abspath(os.path.join(upload_dir, safe_filename))

                    if temp_path and os.path.exists(temp_path):
                        if os.path.exists(file_path):
                            os.remove(file_path)
                        os.replace(temp_path, file_path)
                        temp_path = None

                    existing_doc.file_url = file_path
                    existing_doc.status = DocumentStatus.UPLOADED.value
                    existing_doc.error_message = None
                    db.commit()
                    db.refresh(existing_doc)

                    background_tasks.add_task(
                        process_pdf_background,
                        str(existing_doc.id),
                        file_path,
                    )

                    resp = DocumentResponse.model_validate(existing_doc)
                    resp.is_duplicate = False
                    resp.stage = "UPLOADED"
                    responses.append(resp)
                    continue

            # ------------------------------------------------
            # FINAL FILE NAME
            # ------------------------------------------------

            safe_original_name = (
                os.path.basename(filename)
                .replace(" ", "_")
            )

            safe_filename = (
                f"{content_hash[:12]}_"
                f"{safe_original_name}"
            )

            file_path = os.path.abspath(
                os.path.join(
                    upload_dir,
                    safe_filename,
                )
            )

            # Remove unexpected existing file
            if os.path.exists(file_path):
                os.remove(file_path)

            # Move temp file to final location
            os.replace(
                temp_path,
                file_path,
            )

            temp_path = None

            logger.info(
                f"[UPLOAD] Final PDF saved: "
                f"{file_path}"
            )

            # ------------------------------------------------
            # CREATE DB DOCUMENT
            # ------------------------------------------------

            title = (
                os.path.splitext(filename)[0]
                .replace("_", " ")
                .replace("-", " ")
                .title()
            )

            doc = Document(
                title=title,
                filename=filename,
                file_url=file_path,
                content_hash=content_hash,
                user_id=user_id,
                collection_id=clean_collection_id,
                status=DocumentStatus.UPLOADED.value,
                error_message=None,
                page_count=0,
            )

            db.add(doc)
            db.commit()
            db.refresh(doc)

            logger.info(
                f"[UPLOAD] Database record created: "
                f"id={doc.id}, "
                f"filename={filename}"
            )

            # ------------------------------------------------
            # QUEUE BACKGROUND INGESTION
            # ------------------------------------------------

            background_tasks.add_task(
                process_pdf_background,
                str(doc.id),
                file_path,
            )

            logger.info(
                f"[UPLOAD] Ingestion queued: "
                f"document_id={doc.id}"
            )

            # ------------------------------------------------
            # RETURN IMMEDIATELY
            # ------------------------------------------------

            responses.append(
                DocumentResponse.model_validate(
                    doc
                )
            )

        except Exception as err:

            logger.error(
                f"[UPLOAD] Error processing "
                f"{filename}: {err}",
                exc_info=True,
            )

            if (
                temp_path
                and os.path.exists(temp_path)
            ):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

            continue

    if not responses:

        raise HTTPException(
            status_code=400,
            detail=(
                "No valid PDF files could be "
                "processed from the upload."
            ),
        )

    return responses


# ============================================================
# DOCUMENT STATUS
# ============================================================

@router.get(
    "/documents/{document_id}/status",
    response_model=DocumentResponse,
)
def get_document_status(
    document_id: str,
    db: Session = Depends(get_db),
):
    """
    Lightweight status endpoint.
    Frontend polls THIS endpoint for an individual document.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    chunks_count = (
        db.query(Chunk)
        .filter(Chunk.document_id == document_id)
        .count()
    )

    resp = DocumentResponse.model_validate(doc)
    resp.chunks_count = chunks_count
    resp.stage = (
        "READY"
        if doc.status == DocumentStatus.READY.value
        else "FAILED"
        if doc.status == DocumentStatus.FAILED.value
        else "EMBEDDING"
        if doc.status == DocumentStatus.INDEXING.value
        else "EXTRACTING"
        if doc.status == DocumentStatus.PROCESSING.value
        else "UPLOADED"
    )
    return resp


# ============================================================
# ZIP UPLOAD
# ============================================================

@router.post(
    "/documents/upload-zip",
    response_model=BatchUploadResponse,
    dependencies=[Depends(rate_limiter)],
)
async def upload_zip_documents(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    filename = file.filename or "archive.zip"

    if not filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a ZIP archive.",
        )

    zip_bytes = await file.read()

    if len(zip_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Uploaded ZIP file is empty.",
        )

    upload_dir = get_upload_directory()

    clean_collection_id = (
        collection_id.strip()
        if (
            collection_id
            and collection_id.strip()
            and collection_id
            not in ["undefined", "null"]
        )
        else None
    )

    user_id = (
        current_user.id
        if current_user
        else None
    )

    results: List[BatchUploadItem] = []

    successful_count = 0
    duplicate_count = 0
    failed_count = 0

    with tempfile.TemporaryDirectory() as temp_dir:

        temp_zip_path = os.path.join(
            temp_dir,
            "uploaded.zip",
        )

        with open(
            temp_zip_path,
            "wb",
        ) as f:
            f.write(zip_bytes)

        if not zipfile.is_zipfile(
            temp_zip_path
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid or corrupted "
                    "ZIP archive format."
                ),
            )

        try:

            with zipfile.ZipFile(
                temp_zip_path,
                "r",
            ) as zip_ref:

                infolist = zip_ref.infolist()

                total_uncompressed = sum(
                    item.file_size
                    for item in infolist
                )

                if total_uncompressed > (
                    100 * 1024 * 1024
                ):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "ZIP archive contents "
                            "exceed maximum allowed "
                            "limit of 100MB."
                        ),
                    )

                pdf_members = [
                    item
                    for item in infolist
                    if (
                        not item.is_dir()
                        and item.filename.lower().endswith(
                            ".pdf"
                        )
                    )
                ]

                if not pdf_members:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "ZIP archive contains "
                            "no PDF files."
                        ),
                    )

                if len(pdf_members) > 50:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "ZIP archive exceeds "
                            "maximum limit of "
                            "50 PDF files."
                        ),
                    )

                for member in pdf_members:

                    base_name = os.path.basename(
                        member.filename
                    )

                    try:

                        extracted_bytes = zip_ref.read(
                            member.filename
                        )

                        if not extracted_bytes:

                            results.append(
                                BatchUploadItem(
                                    filename=base_name,
                                    status="IGNORED",
                                    message=(
                                        "File is empty "
                                        "(0 bytes)."
                                    ),
                                )
                            )

                            continue

                        content_hash = calculate_sha256(
                            extracted_bytes
                        )

                        existing_doc = (
                            db.query(Document)
                            .filter(
                                Document.content_hash
                                == content_hash
                            )
                            .first()
                        )

                        if existing_doc:

                            duplicate_count += 1

                            results.append(
                                BatchUploadItem(
                                    filename=base_name,
                                    status="DUPLICATE",
                                    document=(
                                        DocumentResponse
                                        .model_validate(
                                            existing_doc
                                        )
                                    ),
                                    message=(
                                        "Document already "
                                        "exists in library."
                                    ),
                                )
                            )

                            continue

                        safe_filename = (
                            f"{content_hash[:12]}_"
                            f"{base_name.replace(' ', '_')}"
                        )

                        file_path = os.path.abspath(
                            os.path.join(
                                upload_dir,
                                safe_filename,
                            )
                        )

                        with open(
                            file_path,
                            "wb",
                        ) as pf:
                            pf.write(
                                extracted_bytes
                            )

                        title = (
                            os.path.splitext(
                                base_name
                            )[0]
                            .replace("_", " ")
                            .replace("-", " ")
                            .title()
                        )

                        doc = Document(
                            title=title,
                            filename=base_name,
                            file_url=file_path,
                            content_hash=content_hash,
                            user_id=user_id,
                            collection_id=(
                                clean_collection_id
                            ),
                            status=(
                                DocumentStatus
                                .UPLOADED
                                .value
                            ),
                            error_message=None,
                            page_count=0,
                        )

                        db.add(doc)
                        db.commit()
                        db.refresh(doc)

                        background_tasks.add_task(
                            process_pdf_background,
                            str(doc.id),
                            file_path,
                        )

                        successful_count += 1

                        results.append(
                            BatchUploadItem(
                                filename=base_name,
                                status="SUCCESS",
                                document=(
                                    DocumentResponse
                                    .model_validate(doc)
                                ),
                                message=(
                                    "Uploaded and "
                                    "queued for processing."
                                ),
                            )
                        )

                    except Exception as member_err:

                        logger.error(
                            f"[ZIP] Failed processing "
                            f"{member.filename}: "
                            f"{member_err}",
                            exc_info=True,
                        )

                        failed_count += 1

                        results.append(
                            BatchUploadItem(
                                filename=base_name,
                                status="FAILED",
                                message=(
                                    f"Extraction error: "
                                    f"{str(member_err)}"
                                ),
                            )
                        )

        except HTTPException:
            raise

        except Exception as zip_err:

            logger.error(
                f"[ZIP] Error reading ZIP: "
                f"{zip_err}",
                exc_info=True,
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Corrupted or invalid ZIP "
                    f"archive: {str(zip_err)}"
                ),
            )

    return BatchUploadResponse(
        total_files=len(results),
        successful_count=successful_count,
        duplicate_count=duplicate_count,
        failed_count=failed_count,
        results=results,
    )


# ============================================================
# LIST DOCUMENTS
# ============================================================

@router.get(
    "/documents",
    response_model=DocumentListResponse,
)
def list_documents(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    collection_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Document)

    # User isolation
    if current_user:

        query = query.filter(
            (
                Document.user_id
                == current_user.id
            )
            |
            (
                Document.user_id == None
            )
        )

    else:

        query = query.filter(
            Document.user_id == None
        )

    if search:

        search_filter = or_(
            Document.title.ilike(
                f"%{search}%"
            ),
            Document.authors.ilike(
                f"%{search}%"
            ),
            Document.abstract.ilike(
                f"%{search}%"
            ),
            Document.filename.ilike(
                f"%{search}%"
            ),
        )

        query = query.filter(
            search_filter
        )

    if status:
        query = query.filter(
            Document.status == status
        )

    if collection_id:
        query = query.filter(
            Document.collection_id
            == collection_id
        )

    if year:
        query = query.filter(
            Document.year == year
        )

    total = query.count()

    items = (
        query
        .order_by(
            desc(Document.created_at)
        )
        .offset(
            (page - 1) * limit
        )
        .limit(limit)
        .all()
    )

    return DocumentListResponse(
        total=total,
        page=page,
        limit=limit,
        items=[
            DocumentResponse.model_validate(
                document
            )
            for document in items
        ],
    )


# ============================================================
# DOCUMENT DETAIL
# ============================================================

@router.get(
    "/documents/{document_id}",
    response_model=DocumentDetailResponse,
)
def get_document_detail(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    chunk_count = (
        db.query(Chunk)
        .filter(
            Chunk.document_id
            == document_id
        )
        .count()
    )

    data = (
        DocumentResponse
        .model_validate(doc)
        .model_dump()
    )

    data["chunk_count"] = chunk_count

    return DocumentDetailResponse(
        **data
    )


# ============================================================
# SERVE PDF
# ============================================================

@router.get(
    "/documents/{document_id}/file"
)
def get_document_file(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    resolved_path = resolve_document_path(
        doc.file_url
    )

    if not resolved_path:

        raise HTTPException(
            status_code=404,
            detail=(
                "PDF source file not found "
                "on disk."
            ),
        )

    return FileResponse(
        path=resolved_path,
        media_type="application/pdf",
        filename=doc.filename,
        headers={
            "Content-Disposition": (
                f'inline; filename="{doc.filename}"'
            )
        },
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete(
    "/documents/{document_id}"
)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    resolved_path = resolve_document_path(
        doc.file_url
    )

    if resolved_path:

        try:
            os.remove(resolved_path)

        except Exception as e:

            logger.warning(
                f"[DELETE] Could not delete "
                f"{resolved_path}: {e}"
            )

    db.delete(doc)
    db.commit()

    return {
        "message": (
            "Document deleted successfully"
        ),
        "id": document_id,
    }


# ============================================================
# BULK DELETE
# ============================================================

class BulkDeleteRequest(BaseModel):
    document_ids: List[str]


@router.post(
    "/documents/bulk-delete"
)
def bulk_delete_documents(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
):
    if not payload.document_ids:

        return {
            "message": (
                "No document IDs provided"
            ),
            "deleted_count": 0,
        }

    docs = (
        db.query(Document)
        .filter(
            Document.id.in_(
                payload.document_ids
            )
        )
        .all()
    )

    deleted_count = 0

    for doc in docs:

        resolved_path = resolve_document_path(
            doc.file_url
        )

        if resolved_path:

            try:
                os.remove(resolved_path)

            except Exception as e:

                logger.warning(
                    f"[BULK DELETE] Could not "
                    f"delete {resolved_path}: {e}"
                )

        db.delete(doc)
        deleted_count += 1

    db.commit()

    return {
        "message": (
            f"Successfully deleted "
            f"{deleted_count} documents"
        ),
        "deleted_count": deleted_count,
    }


# ============================================================
# RETRY DOCUMENT INDEXING
# ============================================================

@router.post(
    "/documents/{document_id}/retry",
    response_model=DocumentResponse,
)
def retry_document_indexing(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found.",
        )

    resolved_path = resolve_document_path(
        doc.file_url
    )

    if not resolved_path:

        # Try the original filename
        upload_dir = get_upload_directory()

        filename_candidate = os.path.join(
            upload_dir,
            doc.filename,
        )

        if os.path.isfile(
            filename_candidate
        ):
            resolved_path = (
                filename_candidate
            )

    if not resolved_path:

        raise HTTPException(
            status_code=400,
            detail=(
                "PDF source file missing "
                "on server disk. Please "
                "re-upload the file directly "
                "from your computer."
            ),
        )

    # Update database with real path
    doc.file_url = resolved_path
    doc.status = (
        DocumentStatus.UPLOADED.value
    )
    doc.error_message = None

    db.commit()
    db.refresh(doc)

    # Queue retry in background
    background_tasks.add_task(
        process_pdf_background,
        str(doc.id),
        resolved_path,
    )

    logger.info(
        f"[RETRY] Queued document "
        f"{doc.id} for ingestion."
    )

    return DocumentResponse.model_validate(
        doc
    )


# ============================================================
# COLLECTIONS
# ============================================================

@router.get(
    "/collections",
    response_model=List[CollectionResponse],
)
def list_collections(
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    try:

        query = db.query(Collection)

        if current_user:

            query = query.filter(
                (
                    Collection.user_id
                    == current_user.id
                )
                |
                (
                    Collection.user_id == None
                )
            )

        cols = (
            query
            .order_by(
                desc(Collection.created_at)
            )
            .all()
        )

        return [
            CollectionResponse.model_validate(
                collection
            )
            for collection in cols
        ]

    except Exception as e:

        logger.warning(
            f"[COLLECTIONS] Error querying "
            f"collections: {e}"
        )

        return []


# ============================================================
# CREATE COLLECTION
# ============================================================

@router.post(
    "/collections",
    response_model=CollectionResponse,
)
def create_collection(
    payload: CollectionCreate,
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    try:

        user_id = (
            current_user.id
            if current_user
            else None
        )

        col = Collection(
            name=payload.name,
            user_id=user_id,
        )

        db.add(col)
        db.commit()
        db.refresh(col)

        return CollectionResponse.model_validate(
            col
        )

    except Exception as e:

        logger.error(
            f"[COLLECTIONS] Error creating "
            f"collection: {e}",
            exc_info=True,
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


# ============================================================
# DELETE COLLECTION
# ============================================================

@router.delete(
    "/collections/{collection_id}"
)
@router.post(
    "/collections/{collection_id}/delete"
)
def delete_collection(
    collection_id: str,
    current_user: Optional[User] = Depends(
        get_current_user_optional
    ),
    db: Session = Depends(get_db),
):
    try:

        col = (
            db.query(Collection)
            .filter(
                Collection.id
                == collection_id
            )
            .first()
        )

        if not col:

            raise HTTPException(
                status_code=404,
                detail="Collection not found",
            )

        if (
            current_user
            and col.user_id
            and col.user_id
            != current_user.id
        ):

            raise HTTPException(
                status_code=403,
                detail="Forbidden",
            )

        db.query(Document).filter(
            Document.collection_id
            == collection_id
        ).update(
            {
                "collection_id": None
            }
        )

        db.delete(col)
        db.commit()

        return {
            "message": (
                "Collection deleted "
                "successfully"
            ),
            "id": collection_id,
        }

    except HTTPException:
        raise

    except Exception as e:

        logger.error(
            f"[COLLECTIONS] Error deleting "
            f"collection: {e}",
            exc_info=True,
        )

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )