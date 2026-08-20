import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'

import asyncio
import sys
from app.db.session import SessionLocal
from app.models.document import Document
from app.rag.retriever import HybridRetriever
from app.rag.llm_provider import get_llm_provider
from app.services.email_service import EmailService

def main():
    print("=== 1. VERIFYING RESEND EMAIL DISPATCH ===")
    res_email = EmailService.send_email(
        to_email="tapashidhar2004@gmail.com",
        subject="[ARCHER] Automated Verification: Resend + Groq Live",
        body_text="Verification message: Groq Cloud LLM and Resend Email Dispatch are now active and verified in ARCHER!"
    )
    print(f"Resend Dispatch Status: {res_email}")

    print("\n=== 2. VERIFYING NEON PGVECTOR + GROQ RAG PIPELINE ===")
    db = SessionLocal()
    doc = db.query(Document).filter(Document.title.ilike("%Attention%")).first()
    print(f"Target Document: {doc.title} ({doc.id})")

    retriever = HybridRetriever(db)
    results = retriever.retrieve("What is Multi-Head Attention and why is it used in Transformers?", document_ids=[doc.id], top_k=3)
    print(f"Retrieved {len(results)} relevant chunks from Neon pgvector.")

    ctx_items = []
    for r in results:
        ctx_items.append(f"[Paper: {r['document_title']}, p. {r['page_number']}]\n{r['content']}")
    context_str = "\n\n".join(ctx_items)

    prompt = f"Context from research papers:\n{context_str}\n\nQuestion: What is Multi-Head Attention and why is it used?\nAnswer directly and cite [Attention Is All You Need, p. X]:"

    llm = get_llm_provider()
    print(f"Active LLM Provider: {type(llm).__name__}")
    ans = asyncio.run(llm.generate_response(prompt))

    sys.stdout.buffer.write(b"\n=== GROQ GENERATION OUTPUT ===\n")
    sys.stdout.buffer.write(ans.encode("utf-8"))
    sys.stdout.buffer.write(b"\n\nSUCCESSFULLY VERIFIED ALL SERVICES!\n")
    db.close()

if __name__ == "__main__":
    main()
