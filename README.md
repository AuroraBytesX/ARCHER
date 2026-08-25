# ARCHER: Academic Research Retrieval and Comparative Evaluation Engine

ARCHER is a multi-document research intelligence cockpit designed for researchers, engineers, and scientists. It enables users to search, summarize, compare, and query academic papers with verified, page-level citations.

---

## 1. Problem Statement

Academic research workflows require reading dozens of dense scientific publications to understand state-of-the-art methodology, benchmark results, and reported limitations. Traditional document chat tools suffer from critical shortcomings:

1. **Hallucination and Ungrounded Answers**: Generic chatbots invent citations or blend claims across different papers without attributing facts to specific pages.
2. **Single-Document Limitations**: Standard PDF tools cannot reason across multiple documents simultaneously to extract cross-paper comparative matrices.
3. **Loss of Document Structure**: Naive text extraction treats headers, footnotes, equations, and tables uniformly, corrupting semantic meaning.
4. **Cloud Privacy and Cost**: Commercial cloud solutions often leak proprietary pre-publication manuscripts and incur expensive per-token API charges.

ARCHER solves these challenges through an open-source hybrid retrieval-augmented generation (RAG) architecture with structured extraction, pgvector semantic search, and interactive page citations.

---

## 2. Key Features

- **Multi-Document Ingestion**:
  - Ingest individual PDFs, multiple PDFs in bulk, or complete ZIP archives.
  - SHA-256 content hashing for duplicate detection and storage efficiency.
  - Safe ZIP extraction with path traversal (Zip-Slip) protection and uncompressed file size validation.

- **Automated Structural PDF Extraction**:
  - Text and metadata extraction powered by PyMuPDF (`pymupdf`).
  - Heuristic section boundary detection (Abstract, Introduction, Methodology, Experiments, Results, Limitations).
  - Title, author, publication year, and DOI extraction.

- **Hybrid Vector and Keyword Retrieval**:
  - Dense semantic retrieval using `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions).
  - PostgreSQL with `pgvector` extension for efficient cosine similarity search.
  - Balanced hybrid scoring (0.6 vector similarity + 0.4 keyword matching) for precision.

- **Citation-Grounded Assistant**:
  - Context-constrained responses with strict citation syntax: `[Paper Title, p. X]`.
  - Direct readable quote previews in the retrieved evidence drawer without leaving the chat.
  - Multi-turn conversational context with intent detection and gibberish filtering.

- **Multi-Paper Methodology Comparison**:
  - Compare 2 to 5 papers side by side.
  - Structured 8-point matrix covering Problem Formulation, Architecture, Datasets, Evaluation Metrics, Key Results, Limitations, and Compute Requirements.

- **Multi-Document Executive Summarization**:
  - Select any subset of papers to generate an integrated comparative executive synthesis in plain English.
  - Generates joint empirical breakthroughs, shared problem analyses, and individual paper breakdowns.
  - Downloadable Markdown summary reports.

- **User Access and Session Model**:
  - **Registered Users**: Persistent 500-paper library capacity, persistent chat history, user-isolated collections, and dashboard statistics stored in PostgreSQL.
  - **Guest Access**: Per-session access limited to 40 requests. Guests explore public sample papers; inquiry state is scoped per session and resets on page refresh.

- **Production Cloud and Local Providers**:
  - **Cloud LLM (High-Speed & Free)**: Integration with Groq Cloud API featuring `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, and `qwen/qwen3.6-27b` with automated multi-model failover, delivering 500+ tokens/second with sub-second response times.
  - **Dynamic Token Budget & Context Windowing**: Top-4 slotted chunk windowing with character constraints, guaranteeing high citation accuracy while preventing 413 token overflow errors.
  - **Interactive Markdown & Table UI Renderer**: Custom `MarkdownRenderer` component supporting styled, responsive comparison tables, process diagrams (`Step 1 -> Step 2 -> Step 3`), bullet points, and client-side reasoning token filtering.
  - **Auto-Renewing 500-Query Quota**: Automatic quota replenishment on every login for authenticated users.
  - **Embedding Acceleration (FastEmbed ONNX & SentenceTransformers)**: 384-dimensional vector embeddings with instant NumPy vector fallback, optimized for cloud 512MB RAM tiers.
  - **Email Dispatch**: Native Resend Cloud API support with Gmail SMTP fallback for password recovery and OTP verification.
  - **Database**: Serverless PostgreSQL with native `pgvector` on Neon for cosine similarity indexing.
  - **Mobile-Responsive UI**: Fluid layouts with automatic filename truncation and dedicated touch navigation drawers.

---

## 3. System Architecture

```
+-------------------------------------------------------------+
|               React 18 + Vite + TypeScript UI               |
| (Dashboard, Ingestion, Markdown Tables, Comparison, Chat)   |
+-------------------------------------------------------------+
                               |
                               | HTTPS / JSON (Bearer Auth + Auto-Renew Quota)
                               v
+-------------------------------------------------------------+
|                   FastAPI Backend Engine                    |
| (REST Endpoints, NLP Intent Router, Hybrid RAG Pipeline)    |
+-------------------------------------------------------------+
                 |                           |
                 v                           v
+---------------------------------+  +-------------------------------+
|       Embedding Engine          |  |       Cloud LLM Provider      |
|  SentenceTransformers (384 dim) |  |  Groq Cloud (gpt-oss-20b/120b)|
|  + Instant Fallback Provider    |  |  + Multi-Model Failover Chain |
+---------------------------------+  +-------------------------------+
                 |
                 v
+-------------------------------------------------------------+
|                 Neon Serverless PostgreSQL                  |
| - Users, Documents, Chunks, Summaries, Conversations        |
| - pgvector Extension (Cosine Distance Indexing)             |
+-------------------------------------------------------------+
```

---

## 4. Why Virtual Environments Are Used

Python virtual environments (`venv`) isolate ARCHER dependencies from your operating system Python installation:
1. **Dependency Isolation**: Prevents version collisions between ARCHER packages (FastAPI, PyMuPDF, SentenceTransformers, SQLAlchemy) and other tools installed on your computer.
2. **Reproducible Deployments**: Allows deployment platforms like Render to install the exact required versions from `requirements.txt` without unpredictable global package side effects.
3. **Clean Environment**: Keeps project libraries self-contained within the `backend/venv` folder.

---

## 5. Quick Start (Local Setup)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- Neon PostgreSQL Database URL (or local PostgreSQL with `pgvector`)
- Groq API Key (free from console.groq.com)
- Resend API Key (free from resend.com) or Gmail SMTP App Password

### 1. Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL, GROQ_API_KEY, and RESEND_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---
* **License**: MIT License
* **Repository**: [https://github.com/AuroraBytesX/ARCHER](https://github.com/AuroraBytesX/ARCHER)
* **Author Contact**: `tapashidhar2004@gmail.com`

## 6. Deployment Summary

- **Frontend**: Deploy on **Vercel** with build command `npm run build` and output directory `dist`. Set `VITE_API_URL` to your backend Render URL.
- **Backend**: Deploy on **Render** (Web Service) using `pip install -r requirements.txt` and start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add your environment variables in Render.
- **Database**: Hosted on **Neon** Serverless PostgreSQL with `pgvector`.
