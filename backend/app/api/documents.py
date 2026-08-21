import os
import shutil
import zipfile
import tempfile
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.db.session import get_db, SessionLocal
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.models.collection import Collection
from app.models.user import User
from app.schemas.document import (
    DocumentResponse, DocumentDetailResponse, DocumentListResponse,
    CollectionResponse, CollectionCreate, BatchUploadResponse, BatchUploadItem
)
from app.services.pdf_service import PDFExtractionService, calculate_sha256
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import get_embedding_provider
from app.api.deps import get_current_user_optional, rate_limiter
from app.core.config import settings
from app.core.logging import logger

router = APIRouter()

def process_pdf_background(document_id: str, file_path: str):
    """
    Independent PDF ingestion worker:
    PROCESSING (extract + sections) -> INDEXING (chunk + embed) -> READY / FAILED
    """
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found for background ingestion.")
            return

        doc.status = DocumentStatus.PROCESSING.value
        db.commit()

        # Step 1: Extraction & Section Detection via PyMuPDF
        logger.info(f"Extracting PDF text and sections for document: {doc.title} ({doc.id})")
        extracted_data = PDFExtractionService.extract_pdf(file_path)
        
        # Update metadata if extracted has richer info
        if extracted_data.get("title") and doc.title == doc.filename:
            doc.title = extracted_data["title"]
        if extracted_data.get("authors") and not doc.authors:
            doc.authors = extracted_data["authors"]
        if extracted_data.get("abstract"):
            doc.abstract = extracted_data["abstract"]
        if extracted_data.get("year"):
            doc.year = extracted_data["year"]
        if extracted_data.get("doi"):
            doc.doi = extracted_data["doi"]
        doc.page_count = extracted_data.get("page_count", 1)
        
        doc.status = DocumentStatus.INDEXING.value
        db.commit()

        # Step 2: Chunking (recursive & section-aware)
        chunker = ChunkingService()
        raw_chunks = chunker.chunk_document(doc.id, extracted_data.get("pages", []))
        
        if not raw_chunks:
            raw_chunks = [{
                "document_id": doc.id,
                "chunk_index": 0,
                "page_number": 1,
                "section": "General",
                "content": f"Document {doc.title}",
                "token_count": 10
            }]

        # Step 3: Embeddings generation (batched)
        logger.info(f"Generating embeddings for {len(raw_chunks)} chunks of document: {doc.title}")
        embed_provider = get_embedding_provider()
        chunk_texts = [c["content"] for c in raw_chunks]
        embeddings = embed_provider.embed_documents(chunk_texts, batch_size=32)

        chunk_objects = []
        for i, c_data in enumerate(raw_chunks):
            chunk_obj = Chunk(
                document_id=doc.id,
                chunk_index=c_data["chunk_index"],
                page_number=c_data["page_number"],
                section=c_data["section"],
                content=c_data["content"],
                token_count=c_data["token_count"],
                embedding=embeddings[i] if i < len(embeddings) else None
            )
            chunk_objects.append(chunk_obj)

        db.bulk_save_objects(chunk_objects)
        
        doc.status = DocumentStatus.READY.value
        doc.error_message = None
        db.commit()
        logger.info(f"Document {doc.title} ({doc.id}) successfully INDEXED and READY with {len(chunk_objects)} chunks.")

    except Exception as e:
        logger.error(f"Failed processing PDF for document {document_id}: {str(e)}", exc_info=True)
        db.rollback()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = DocumentStatus.FAILED.value
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/documents/upload", response_model=List[DocumentResponse], dependencies=[Depends(rate_limiter)])
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    collection_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    clean_collection_id = collection_id.strip() if (collection_id and collection_id.strip() and collection_id not in ["undefined", "null"]) else None
    user_id = current_user.id if current_user else None
    responses: List[DocumentResponse] = []

    for file in files:
        filename = file.filename or "unknown.pdf"
        if not filename.lower().endswith(".pdf"):
            logger.warning(f"Skipping non-PDF file: {filename}")
            continue

        try:
            content = await file.read()
            if len(content) == 0:
                logger.warning(f"Skipping empty file: {filename}")
                continue

            content_hash = calculate_sha256(content)

            existing_doc = db.query(Document).filter(Document.content_hash == content_hash).first()
            if existing_doc:
                logger.info(f"Duplicate document detected for {filename} (Hash: {content_hash}). Returning existing record.")
                responses.append(DocumentResponse.model_validate(existing_doc))
                continue

            safe_filename = f"{content_hash[:12]}_{filename.replace(' ', '_')}"
            file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
            with open(file_path, "wb") as f:
                f.write(content)

            title = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ").title()
            doc = Document(
                title=title,
                filename=filename,
                file_url=file_path,
                content_hash=content_hash,
                user_id=user_id,
                collection_id=clean_collection_id,
                status=DocumentStatus.UPLOADED.value
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            background_tasks.add_task(process_pdf_background, doc.id, file_path)
            responses.append(DocumentResponse.model_validate(doc))
        except Exception as err:
            logger.error(f"Error processing upload for {filename}: {err}")
            continue

    if not responses:
        raise HTTPException(status_code=400, detail="No valid PDF files could be processed from the upload.")

    return responses

@router.post("/documents/upload-zip", response_model=BatchUploadResponse, dependencies=[Depends(rate_limiter)])
async def upload_zip_documents(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    collection_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    filename = file.filename or "archive.zip"
    if not filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a ZIP archive.")

    zip_bytes = await file.read()
    if len(zip_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded ZIP file is empty.")

    clean_collection_id = collection_id.strip() if (collection_id and collection_id.strip() and collection_id not in ["undefined", "null"]) else None
    user_id = current_user.id if current_user else None
    results: List[BatchUploadItem] = []
    successful_count = 0
    duplicate_count = 0
    failed_count = 0

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_zip_path = os.path.join(temp_dir, "uploaded.zip")
        with open(temp_zip_path, "wb") as f:
            f.write(zip_bytes)

        if not zipfile.is_zipfile(temp_zip_path):
            raise HTTPException(status_code=400, detail="Invalid or corrupted ZIP archive format.")

        try:
            with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
                infolist = zip_ref.infolist()
                
                total_uncompressed = sum(z.file_size for z in infolist)
                if total_uncompressed > 100 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="ZIP archive contents exceed maximum allowed limit of 100MB.")

                pdf_members = [m for m in infolist if not m.is_dir() and m.filename.lower().endswith(".pdf")]
                
                if not pdf_members:
                    raise HTTPException(status_code=400, detail="ZIP archive contains no PDF files.")

                if len(pdf_members) > 50:
                    raise HTTPException(status_code=400, detail="ZIP archive exceeds maximum limit of 50 PDF files.")

                for member in pdf_members:
                    extracted_target = os.path.abspath(os.path.join(temp_dir, member.filename))
                    if not extracted_target.startswith(os.path.abspath(temp_dir)):
                        failed_count += 1
                        results.append(BatchUploadItem(
                            filename=member.filename,
                            status="FAILED",
                            message="Unsafe file path detected (path traversal rejected)."
                        ))
                        continue

                    try:
                        extracted_bytes = zip_ref.read(member.filename)
                        if len(extracted_bytes) == 0:
                            results.append(BatchUploadItem(
                                filename=os.path.basename(member.filename),
                                status="IGNORED",
                                message="File is empty (0 bytes)."
                            ))
                            continue

                        content_hash = calculate_sha256(extracted_bytes)
                        base_name = os.path.basename(member.filename)

                        existing_doc = db.query(Document).filter(Document.content_hash == content_hash).first()
                        if existing_doc:
                            duplicate_count += 1
                            results.append(BatchUploadItem(
                                filename=base_name,
                                status="DUPLICATE",
                                document=DocumentResponse.model_validate(existing_doc),
                                message="Document already exists in library."
                            ))
                            continue

                        safe_filename = f"{content_hash[:12]}_{base_name.replace(' ', '_')}"
                        file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
                        with open(file_path, "wb") as pf:
                            pf.write(extracted_bytes)

                        title = os.path.splitext(base_name)[0].replace("_", " ").replace("-", " ").title()
                        doc = Document(
                            title=title,
                            filename=base_name,
                            file_url=file_path,
                            content_hash=content_hash,
                            user_id=user_id,
                            collection_id=clean_collection_id,
                            status=DocumentStatus.UPLOADED.value
                        )
                        db.add(doc)
                        db.commit()
                        db.refresh(doc)

                        background_tasks.add_task(process_pdf_background, doc.id, file_path)
                        successful_count += 1
                        results.append(BatchUploadItem(
                            filename=base_name,
                            status="SUCCESS",
                            document=DocumentResponse.model_validate(doc),
                            message="Uploaded and queued for processing."
                        ))

                    except Exception as member_err:
                        logger.error(f"Failed extracting PDF member {member.filename}: {member_err}")
                        failed_count += 1
                        results.append(BatchUploadItem(
                            filename=os.path.basename(member.filename),
                            status="FAILED",
                            message=f"Extraction error: {str(member_err)}"
                        ))
        except Exception as zip_err:
            logger.error(f"Error reading zip structure: {zip_err}")
            raise HTTPException(status_code=400, detail=f"Corrupted or invalid zip archive: {str(zip_err)}")

    return BatchUploadResponse(
        total_files=len(results),
        successful_count=successful_count,
        duplicate_count=duplicate_count,
        failed_count=failed_count,
        results=results
    )

@router.get("/documents", response_model=DocumentListResponse)
def list_documents(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    collection_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Document)

    # Scoped user isolation (shows user's papers + unowned public sample papers)
    if current_user:
        query = query.filter((Document.user_id == current_user.id) | (Document.user_id == None))
    else:
        query = query.filter(Document.user_id == None)

    if search:
        search_filter = or_(
            Document.title.ilike(f"%{search}%"),
            Document.authors.ilike(f"%{search}%"),
            Document.abstract.ilike(f"%{search}%"),
            Document.filename.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    if status:
        query = query.filter(Document.status == status)

    if collection_id:
        query = query.filter(Document.collection_id == collection_id)

    if year:
        query = query.filter(Document.year == year)

    total = query.count()
    items = query.order_by(desc(Document.created_at)).offset((page - 1) * limit).limit(limit).all()

    return DocumentListResponse(
        total=total,
        page=page,
        limit=limit,
        items=[DocumentResponse.model_validate(d) for d in items]
    )

@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
def get_document_detail(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    chunk_count = db.query(Chunk).filter(Chunk.document_id == document_id).count()

    data = DocumentResponse.model_validate(doc).model_dump()
    data["chunk_count"] = chunk_count
    return DocumentDetailResponse(**data)

@router.get("/documents/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.file_url or not os.path.exists(doc.file_url):
        raise HTTPException(status_code=404, detail="PDF source file not found on disk.")

    resolved_path = os.path.abspath(doc.file_url)
    return FileResponse(
        path=resolved_path,
        media_type="application/pdf",
        filename=doc.filename,
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'}
    )

@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.file_url and os.path.exists(doc.file_url):
        try:
            os.remove(doc.file_url)
        except Exception as e:
            logger.warning(f"Could not delete physical file {doc.file_url}: {e}")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully", "id": document_id}

class BulkDeleteRequest(BaseModel):
    document_ids: List[str]

@router.post("/documents/bulk-delete")
def bulk_delete_documents(payload: BulkDeleteRequest, db: Session = Depends(get_db)):
    if not payload.document_ids:
        return {"message": "No document IDs provided", "deleted_count": 0}

    docs = db.query(Document).filter(Document.id.in_(payload.document_ids)).all()
    deleted_count = 0
    for doc in docs:
        if doc.file_url and os.path.exists(doc.file_url):
            try:
                os.remove(doc.file_url)
            except Exception as e:
                logger.warning(f"Could not delete physical file {doc.file_url}: {e}")
        db.delete(doc)
        deleted_count += 1

    db.commit()
    return {"message": f"Successfully deleted {deleted_count} documents", "deleted_count": deleted_count}

@router.post("/documents/{document_id}/retry", response_model=DocumentResponse)
def retry_document_indexing(document_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if not doc.file_url or not os.path.exists(doc.file_url):
        raise HTTPException(status_code=400, detail="PDF source file missing on disk.")

    doc.status = DocumentStatus.UPLOADED.value
    doc.error_message = None
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_pdf_background, doc.id, doc.file_url)
    return DocumentResponse.model_validate(doc)

@router.get("/collections", response_model=List[CollectionResponse])
def list_collections(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Collection)
    if current_user:
        query = query.filter((Collection.user_id == current_user.id) | (Collection.user_id == None))
    cols = query.order_by(desc(Collection.created_at)).all()
    return [CollectionResponse.model_validate(c) for c in cols]

@router.post("/collections", response_model=CollectionResponse)
def create_collection(
    payload: CollectionCreate,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    col = Collection(name=payload.name, user_id=user_id)
    db.add(col)
    db.commit()
    db.refresh(col)
    return CollectionResponse.model_validate(col)

@router.delete("/collections/{collection_id}")
def delete_collection(
    collection_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    if current_user and col.user_id and col.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db.query(Document).filter(Document.collection_id == collection_id).update({"collection_id": None})
    db.delete(col)
    db.commit()
    return {"message": "Collection deleted successfully", "id": collection_id}
