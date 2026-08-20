# ARCHER System Architecture

ARCHER (**AI-Powered, Citation-Grounded Hybrid Extraction and Retrieval System for Multi-Document Research Summarization**) is engineered for high-throughput, citation-verifiable research literature analysis across 100 to 200+ academic papers.

---

## 1. High-Level System Architecture

```
                                  [ User / Researcher ]
                                             │
                                    (Web GUI / REST)
                                             ▼
                      ┌─────────────────────────────────────────┐
                      │    React 18 + Vite + Tailwind Frontend   │
                      │  - Multi-PDF Upload Queue               │
                      │  - Interactive Citation Badges [p. X]   │
                      │  - 7-Point Comparison Matrix            │
                      │  - Research Analytics (Recharts)        │
                      └────────────────────┬────────────────────┘
                                           │ HTTP/JSON
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │            FastAPI REST API             │
                      │  - Background Ingestion Workers         │
                      │  - SHA-256 Duplicate Gatekeeper         │
                      │  - Hybrid Query Dispatcher              │
                      └─────────────┬───────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│  PyMuPDF &   │            │   Database   │            │   Hybrid     │
│  Chunking    │            │ PostgreSQL + │            │  Retriever   │
│  Service     │            │   pgvector   │            │  & Reranker  │
└───────┬──────┘            └───────┬──────┘            └───────┬──────┘
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│ Sentence-    │            │ Chunks &     │            │ Ollama / LLM │
│ Transformers │───────────►│ Embeddings   │───────────►│ Grounded RAG │
│ MiniLM-L6-v2 │            │ (384-dim)    │            │ Engine       │
└──────────────┘            └──────────────┘            └──────────────┘
```

---

## 2. Ingestion & Chunking Architecture

1. **Validation & Hashing**:
   - PDF uploads are validated and hashed via **SHA-256**.
   - If a duplicate hash is detected, existing document metadata is returned without reprocessing.
2. **Page-Aware PyMuPDF Text Extraction**:
   - PyMuPDF (`fitz`) parses text stream page-by-page.
   - Text is normalized (hyphenation removal across lines, blank line deduplication).
3. **Section Detection**:
   - Regular expression pattern recognizer detects academic sections (`Abstract`, `Introduction`, `Related Work`, `Methodology`, `Experiments`, `Results`, `Limitations`, `Conclusion`).
4. **Recursive Token-Aware Chunking**:
   - Chunks are split around target size (~800 tokens, ~120 tokens overlap).
   - Crucially, chunks retain `document_id`, `page_number`, `section`, `chunk_index`, and `token_count`.
5. **Batched Dense Vector Embedding**:
   - Embeddings are generated in batches of 32 using `sentence-transformers/all-MiniLM-L6-v2`.
   - Embeddings are written to PostgreSQL `pgvector` indexes.

---

## 3. Grounded RAG Architecture

1. **Query Ingestion**:
   - User inputs a research question with optional scoping filters (all papers, specific collection, or subset of papers).
2. **Hybrid Search Execution**:
   - **Dense Semantic Retrieval**: Cosine similarity against 384-dimensional chunk embeddings.
   - **Keyword Retrieval**: Token matching over indexed paper text and titles.
   - **Hybrid Fusion**: Weighted combination `(0.6 * vector_score) + (0.4 * keyword_score)`.
3. **Context Construction**:
   - Top-K chunks (default $K=8$) are formatted with structured evidence tags: `[Paper Title, p. X, Section: Y]`.
4. **Strict Grounding Prompt**:
   - Enforces answers derived strictly from provided evidence with zero hallucination.
   - Requires inline citations formatted as `[Paper Title, p. X]`.
5. **Citation Verification & Confidence Scoring**:
   - The engine validates cited references and calculates an Evidence Coverage Score (0.0 to 1.0) based on source similarity.
