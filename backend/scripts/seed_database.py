import os
import sys

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal, init_db
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.services.pdf_service import PDFExtractionService, calculate_sha256
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import get_embedding_provider
from app.core.config import settings

def seed():
    print("Initializing database...")
    init_db()
    
    db = SessionLocal()
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sample_papers"))
    
    pdf_files = [f for f in os.listdir(sample_dir) if f.endswith(".pdf")]
    if not pdf_files:
        print(f"No PDFs found in {sample_dir}. Run seed_sample_papers.py first.")
        return

    print(f"Seeding {len(pdf_files)} research papers into database...")
    chunker = ChunkingService()
    embed_provider = get_embedding_provider()

    for filename in pdf_files:
        file_path = os.path.join(sample_dir, filename)
        with open(file_path, "rb") as f:
            content = f.read()

        content_hash = calculate_sha256(content)
        existing = db.query(Document).filter(Document.content_hash == content_hash).first()
        if existing:
            print(f"  - Paper '{existing.title}' already seeded.")
            continue

        extracted = PDFExtractionService.extract_pdf(file_path)
        title = extracted.get("title") or os.path.splitext(filename)[0].replace("_", " ")

        safe_filename = f"{content_hash[:12]}_{filename.replace(' ', '_')}"
        upload_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
        with open(upload_path, "wb") as pf:
            pf.write(content)

        doc = Document(
            title=title,
            authors=extracted.get("authors"),
            abstract=extracted.get("abstract"),
            year=extracted.get("year"),
            doi=extracted.get("doi"),
            filename=filename,
            file_url=upload_path,
            page_count=extracted.get("page_count", 2),
            status=DocumentStatus.INDEXING.value,
            content_hash=content_hash
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        raw_chunks = chunker.chunk_document(doc.id, extracted.get("pages", []))
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
        db.commit()
        print(f"  + Indexed '{title}' ({len(chunk_objects)} chunks)")

    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
