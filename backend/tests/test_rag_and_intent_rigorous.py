import os
import sys

os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
from app.db.session import SessionLocal, init_db
from app.rag.rag_engine import RAGEngine

technical_questions = [
    "What is the self-attention mechanism in the Transformer architecture?",
    "How does BERT use bidirectional pre-training compared to standard language models?",
    "What is Low-Rank Adaptation (LoRA) and how does it reduce trainable parameters?",
    "How does Retrieval-Augmented Generation (RAG) combine parametric and non-parametric memory?",
    "What is the multi-head attention formula used in Attention Is All You Need?",
    "What two unsupervised tasks were used to pre-train BERT?",
    "Why does LoRA freeze pre-trained model weights during fine-tuning?",
    "What is the difference between RAG-Sequence and RAG-Token models?",
    "What benchmark datasets were evaluated in the BERT paper?",
    "What compute or memory savings are achieved with LoRA on large language models?",
    "What encoder-decoder structure is used in the Transformer model?",
    "How does RAG retrieve documents using dense vector representations?"
]

rubbish_and_out_of_scope_queries = [
    "what what",
    "asdfghjkl12345",
    "???!!???",
    "How do I bake a chocolate cake at home?",
    "Who is the current prime minister of the United Kingdom?"
]

async def run_full_suite():
    init_db()
    db = SessionLocal()
    engine = RAGEngine(db)

    print("================================================================================")
    print("PART 1: TESTING 12 CONTEXT-BASED TECHNICAL QUESTIONS ACROSS 4 RESEARCH PAPERS")
    print("================================================================================")

    for idx, q in enumerate(technical_questions, 1):
        print(f"\n[Q{idx}] {q}")
        res = await engine.answer_question(query=q)
        print(f"  -> Evidence Score: {res.evidence_score}")
        print(f"  -> Retrieved Chunks: {res.retrieved_chunks_count}")
        print(f"  -> Grounded Citations ({len(res.citations)}):")
        for c in res.citations[:2]:
            print(f"      * [{c.paper_title}, p. {c.page_number}]")
        print(f"  -> Generated Answer Preview:")
        preview = res.answer[:220].replace('\n', ' ')
        print(f"      {preview}...")

    print("\n================================================================================")
    print("PART 2: TESTING 5 GIBBERISH AND OUT-OF-SCOPE / OFF-TOPIC QUERIES")
    print("================================================================================")

    for idx, q in enumerate(rubbish_and_out_of_scope_queries, 1):
        print(f"\n[Rubbish/Out-of-Scope Q{idx}] \"{q}\"")
        res = await engine.answer_question(query=q)
        print(f"  -> Evidence Score: {res.evidence_score}")
        print(f"  -> Citations Returned: {len(res.citations)}")
        print(f"  -> Assistant Handling:")
        print(f"      {res.answer}")

    db.close()

if __name__ == "__main__":
    asyncio.run(run_full_suite())
