# ARCHER REST API Reference

The FastAPI backend exposes the following typed REST endpoints under `/api`.

---

## 1. Authentication & User Quota (`/api/auth`)
- `POST /api/auth/register`
  - Registers a new user account with hashed password and initial 500-query library quota.
- `POST /api/auth/login`
  - Authenticates user, issues JWT bearer token, and automatically replenishes the 500-query quota.
- `GET /api/auth/me`
  - Returns authenticated user profile, active quota balance, and library statistics.
- `POST /api/auth/forgot-password`
  - Sends 6-digit OTP verification email via Resend Cloud.
- `POST /api/auth/reset-password`
  - Verifies OTP and resets user password.
- `POST /api/contact`
  - Dispatches contact inquiries directly to `tapashidhar2004@gmail.com`.

---

## 2. Health & Status
- `GET /api/health`
  - Returns service status, database connectivity, embedding model, and Groq LLM health.

---

## 2. Documents & Collections
- `POST /api/documents/upload`
  - Accepts multipart/form-data with multiple PDF files.
  - Automatically generates SHA-256 hashes, prevents duplicates, extracts text, detects sections, chunks tokens, and indexes vectors in the background.
- `GET /api/documents`
  - Paginated document library query with filters (`search`, `status`, `collection_id`, `year`, `page`, `limit`).
- `GET /api/documents/{id}`
  - Returns document details, page count, chunks count, and summary status.
- `DELETE /api/documents/{id}`
  - Deletes document, on-disk file, chunks, and summaries.
- `POST /api/documents/{id}/retry`
  - Retries failed ingestion jobs.
- `GET /api/collections` / `POST /api/collections`
  - Collection grouping management.

---

## 3. Search
- `GET /api/search`
  - Parameters: `q` (query), `mode` (`hybrid` | `vector` | `keyword`), `collection_id`, `document_ids`, `year_min`, `year_max`, `top_k`, `page`, `limit`.
  - Returns ranked list of chunks with relevance scores, page numbers, sections, and excerpts.

---

## 4. Grounded Chat & RAG
- `POST /api/chat`
  - Body: `{ "message": str, "conversation_id"?: str, "collection_id"?: str, "document_ids"?: string[], "top_k"?: int }`
  - Returns: `{ "conversation_id": str, "message_id": str, "answer": str, "citations": CitationItem[], "evidence_score": float, "retrieved_chunks_count": int }`
- `GET /api/conversations`
- `GET /api/conversations/{id}`
- `DELETE /api/conversations/{id}`

---

## 5. Paper Summaries
- `GET /api/summaries/{document_id}`
  - Returns cached 8-point structured paper analysis.
- `POST /api/summaries/{document_id}`
  - Generates or force-regenerates structured summary (Objective, Methodology, Datasets, Findings, Limitations, Future Work, Executive Summary).

---

## 6. Multi-Paper Comparison
- `POST /api/compare`
  - Body: `{ "document_ids": ["id1", "id2", ...] }`
  - Returns: 7-point comparative matrix across Objective, Methodology, Dataset, Model, Metrics, Results, Limitations, and Executive Comparative Synthesis.

---

## 7. Research Insights & Gaps
- `GET /api/insights`
  - Returns publication timeline distribution, methodology frequencies, dataset frequencies, and synthesized research gaps.
- `POST /api/insights/gaps`
  - Body: `{ "document_ids"?: string[] }`
  - Synthesizes recurring limitations across selected papers into novel research-gap directions with human verification disclaimers.
