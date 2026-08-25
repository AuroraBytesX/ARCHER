# ARCHER: Comprehensive Technical and Architectural Documentation

---

## 1. Project Overview and Identity

* **Project Name**: ARCHER (Academic Research Retrieval and Comparative Evaluation Engine)
* **Repository**: [https://github.com/AuroraBytesX/ARCHER](https://github.com/AuroraBytesX/ARCHER)
* **Primary Tech Stack**: FastAPI (Python 3.10+), React 18, TypeScript, Tailwind CSS, Neon Serverless PostgreSQL with pgvector, SentenceTransformers, Groq Cloud LLM, Resend Cloud Email API.
* **One-Line Summary**: Multi-document research intelligence cockpit featuring hybrid pgvector retrieval, citation-grounded assistant, and cross-paper comparative matrices.

### 1.1 The Problem Being Solved
Reading dozens of dense scientific publications to extract methodology, benchmark results, and reported limitations takes hours. Existing generic chatbots present critical failure modes:
1. **Hallucination & Lack of Attribution**: LLMs fabricate claims or blend facts across different papers without attributing evidence to specific pages.
2. **Monolithic Ingestion**: Standard PDF tools discard document structure, blending abstract, equations, methodology, and limitations into unstructured plain text.
3. **Single-Paper Scope**: Conventional document chat tools operate on one file at a time, preventing cross-paper comparative matrix analysis.
4. **Cloud Privacy and Cost**: Commercial cloud solutions often leak proprietary pre-publication manuscripts and incur expensive per-token API charges.

### 1.2 The ARCHER Solution
ARCHER provides an open-source, local-first and cloud-ready research intelligence platform:
* **Structural PDF Ingestion**: PyMuPDF extraction detecting structural sections (Abstract, Introduction, Methodology, Experiments, Results, Limitations).
* **Hybrid Vector and Keyword Retrieval**: Combines 384-dimensional dense semantic vectors in PostgreSQL (pgvector) with keyword matching to guarantee precision.
* **Citation-Grounded Assistant**: Enforces strict context constraints with verifiable citations: `[Paper Title, p. X]`.
* **Multi-Paper Comparative Synthesis**: Generates 8-dimension comparative matrices and multi-document executive summaries.
* **Zero Infrastructure Cost**: Runs locally on CPU or deploys to free cloud tiers (Neon, Groq, Resend, Render, Vercel) at $0.00 total monthly cost.

---

## 2. Table of Contents

1. Overview and Identity
2. System Architecture and Component Interactions
3. Core Modules and Subsystems
4. Data Models and Database Architecture
5. Grounded RAG and AI/LLM Subsystem
6. Complete REST API Reference
7. Authentication, Access Control, and Security
8. Frontend Application Architecture
9. Configuration and Environment Variables
10. Installation and Local Setup
11. Testing and Verification Suite
12. Production Cloud Deployment (Vercel + Render + Neon)
13. Project File Organization
14. Troubleshooting and Operational Guidance
15. Limitations and Roadmap
16. License and Verification Links

---

## 3. System Architecture and Component Interactions

```text
[ React 18 + TypeScript Client ]
               |
               | HTTPS / JSON (Bearer Auth + Rate Limiting)
               v
[ FastAPI Backend Engine (app.main) ]
    |
    +---> [ API Layer (app.api) ]
    |         |-- /auth (Register, Login, Password Recovery)
    |         |-- /documents (Upload, ZIP Extract, Search, Stream)
    |         |-- /chat (Hybrid RAG, Intent Filter, Citations)
    |         |-- /compare (8-Point Comparative Matrix)
    |         |-- /insights (Executive Summarization)
    |         `-- /contact (Resend Cloud Email Dispatch)
    |
    +---> [ Ingestion Pipeline (app.services) ]
    |         |-- PyMuPDF Parser (Section boundary detection)
    |         |-- Recursive Sliding-Window Chunker (800 chars, 120 overlap)
    |         `-- SentenceTransformers Embeddings (all-MiniLM-L6-v2, 384 dim)
    |
    +---> [ Database Layer (app.db, PostgreSQL 16 + pgvector) ]
    |         |-- users, documents, document_chunks, collections
    |         `-- conversations, messages, citations, paper_summaries
    |
    +---> [ LLM Inference Engine (app.rag.llm_provider) ]
              |-- Priority 1: Groq Cloud LLM (groq/compound-mini or Llama-3)
              |-- Priority 2: Generic OpenAI Compatible Endpoints
              `-- Priority 3: Local Offline Ollama (llama3:latest)
```

---

## 4. Core Modules and Subsystems

| Module | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **App Entry Point** | `backend/app/main.py` | FastAPI setup, CORS middleware, API router mounting, lifespan startup/shutdown. |
| **Configuration** | `backend/app/core/config.py` | Pydantic BaseSettings loading environment variables for DB, LLM, SMTP, and Resend. |
| **Database Session** | `backend/app/db/session.py` | SQLAlchemy engine initialization, connection pooling, and automated schema migration. |
| **PDF Parser** | `backend/app/services/pdf_service.py` | PyMuPDF text extraction, section boundary heuristics, and metadata parsing. |
| **Chunking Service** | `backend/app/services/chunking_service.py` | Recursive character chunking with sliding-window overlap and metadata tagging. |
| **Embedding Engine** | `backend/app/services/embedding_service.py` | SentenceTransformers dense vector generation on CPU (384 dimensions). |
| **Hybrid Retriever** | `backend/app/rag/retriever.py` | Balanced vector cosine similarity and keyword search across PostgreSQL chunks. |
| **LLM Provider** | `backend/app/rag/llm_provider.py` | Provider abstraction routing to Groq Cloud, OpenAI compatible, or local Ollama. |
| **Email Service** | `backend/app/services/email_service.py` | Resend Cloud REST API dispatch with Gmail SMTP fallback for password reset and contact. |
| **Dependencies** | `backend/app/api/deps.py` | Sliding-window rate limiter (40 req/min) and Bearer token user extraction. |

---

## 5. Data Models and Database Architecture

ARCHER uses PostgreSQL 16 with the native `pgvector` extension.

```text
+-------------------+       +-----------------------+       +-------------------------+
|      users        | 1   * |       documents       | 1   * |     document_chunks     |
|-------------------|-------|-----------------------|-------|-------------------------|
| id (UUID / PK)    |       | id (UUID / PK)        |       | id (UUID / PK)          |
| email (Unique)    |       | user_id (FK -> users) |       | document_id (FK -> doc) |
| name              |       | title                 |       | page_number (int)       |
| hashed_password   |       | filename              |       | section (varchar)       |
| reset_token       |       | file_url              |       | content (text)          |
| created_at        |       | content_hash (SHA256) |       | token_count (int)       |
+-------------------+       | status (READY/FAILED) |       | embedding (vector(384)) |
                            +-----------------------+       +-------------------------+
                                        |
                                        | 1
                                        v *
                            +-----------------------+
                            |     conversations     |
                            |-----------------------|
                            | id (UUID / PK)        |
                            | user_id (FK -> users) |
                            | title                 |
                            | created_at            |
                            +-----------------------+
                                        |
                                        | 1
                                        v *
                            +-----------------------+
                            |       messages        |
                            |-----------------------|
                            | id (UUID / PK)        |
                            | conversation_id (FK)  |
                            | role (user/assistant) |
                            | content (text)        |
                            | created_at            |
                            +-----------------------+
```

---

## 6. Grounded RAG and AI/LLM Subsystem

### 6.1 Hybrid Retrieval Algorithm
When a user asks a question, ARCHER computes cosine similarity against stored 384-dimensional chunk vectors:

$$\text{Cosine Similarity}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\|_2 \|\mathbf{d}\|_2}$$

The hybrid score combines dense semantic retrieval with keyword matching:

$$\text{Score}_{\text{final}} = \alpha \cdot \text{Similarity}_{\text{vector}} + (1 - \alpha) \cdot \text{Score}_{\text{keyword}}$$

where \(\alpha = 0.6\).

### 6.2 Intent Classification & Gibberish Filtering
Before calling the LLM, the backend analyzes user intent:
* **Casual / Greetings** ("hello", "hi"): Returns a natural research assistant greeting.
* **Gibberish / Noise** ("what what", keyboard mashing): Rejects without calling the LLM, prompting for a specific research query.
* **Out-of-Scope Queries** (recipes, political trivia): Explains that the query is outside the scope of the ingested research papers.

### 6.3 LLM Provider Routing

| Provider | Active Model | Purpose | Default Status |
| :--- | :--- | :--- | :--- |
| **Groq Cloud** | `groq/compound-mini` or Llama-3 | Ultra-fast cloud inference (500 tokens/sec) | Primary (if `GROQ_API_KEY` is set) |
| **OpenAI Compatible** | User-configured | External API fallback | Secondary |
| **Local Ollama** | `llama3:latest` | Local offline development | Fallback (if no cloud API key provided) |

---

## 7. Complete REST API Reference

### 7.1 Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account (name, email, password) | No |
| `POST` | `/api/auth/login` | Authenticate user and issue access token | No |
| `POST` | `/api/auth/forgot-password` | Dispatch password recovery token via Resend/SMTP | No |
| `POST` | `/api/auth/reset-password` | Validate recovery token and set new password | No |
| `GET` | `/api/auth/me` | Return authenticated user profile and tier | Yes (Bearer) |

### 7.2 Document Management (`/api/documents`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Upload individual or multiple PDF files | Optional |
| `POST` | `/api/documents/upload-zip` | Upload and securely extract a ZIP archive of PDFs | Optional |
| `GET` | `/api/documents` | List documents with search, author, and year filters | Optional |
| `GET` | `/api/documents/{id}` | Get document metadata, chunks, and section outline | Optional |
| `GET` | `/api/documents/{id}/status` | Lightweight status endpoint for single-document ingestion progress | Optional |
| `POST` | `/api/documents/{id}/retry` | Re-queue and re-index an existing document | Optional |
| `GET` | `/api/documents/{id}/file` | Stream physical PDF file to the client viewer | Optional |
| `DELETE` | `/api/documents/{id}` | Delete a document and its vector embeddings | Optional |
| `POST` | `/api/documents/bulk-delete` | Bulk delete multiple documents by ID list | Optional |

### 7.3 Research Assistant & Synthesis (`/api/chat`, `/api/compare`, `/api/insights`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/chat` | Citation-grounded research query answering | Optional |
| `GET` | `/api/conversations` | List conversation histories for active user/session | Optional |
| `GET` | `/api/conversations/{id}` | Get messages and citations for a conversation | Optional |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation and message history | Optional |
| `POST` | `/api/compare` | Generate 8-point comparative matrix across 2 to 5 papers | Optional |
| `POST` | `/api/insights/summarize` | Multi-paper executive comparative synthesis | Optional |
| `GET` | `/api/insights/gaps` | Extract domain research gaps and hypotheses | Optional |
| `POST` | `/api/contact` | Dispatch developer inquiry to `tapashidhar2004@gmail.com` | Optional |

---

## 8. Authentication, Access Control, and Security

1. **User Tier and Limitation Model**:
   * **Registered Users**: Persistent 500-paper library capacity, persistent conversation histories, user-isolated custom collections, and cloud-synced dashboard statistics.
   * **Guest Users**: Allowed up to 5 PDF uploads per session and 40 queries. Temporary inquiries and uploads reset on browser refresh.
   * **Sample Benchmark Papers**: 4 public open-access research papers (*Attention Is All You Need*, *BERT*, *LoRA*, *RAG*) are pre-seeded for immediate testing.
2. **Password Security**: Passwords hashed using SHA-256 with cryptographic salting.
3. **Application-Level Rate Limiting**: Backend sliding-window limiter enforces a 40 requests/minute ceiling per client IP to prevent abuse.
4. **Path Traversal Protection**: ZIP archive ingestion validates member file paths to block Zip-Slip directory traversal attacks.
5. **Secret Management**: Real `.env` files are excluded via `.gitignore`. Only safe `.env.example` templates are committed.

---

## 9. Configuration and Environment Variables

### Backend Variables (`backend/.env`)

| Variable | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql+psycopg://user:pass@host/db?sslmode=require` | Neon or local PostgreSQL connection string. |
| `GROQ_API_KEY` | Optional | `gsk_your_groq_key_here` | API key for high-speed cloud Groq inference. |
| `GROQ_MODEL` | Optional | `groq/compound-mini` | Model ID for Groq generation. |
| `RESEND_API_KEY` | Optional | `re_your_resend_key_here` | API key for Resend cloud email delivery. |
| `RESEND_FROM_EMAIL`| Optional | `onboarding@resend.dev` | Verified sender address for Resend. |
| `ADMIN_EMAIL` | Yes | `tapashidhar2004@gmail.com` | Recipient email for Developer Contact inquiries. |
| `EMBEDDING_PROVIDER`| Yes | `sentence_transformers` | Embeddings engine. |
| `EMBEDDING_DEVICE`| Yes | `cpu` | Hardware target for embeddings (`cpu` or `cuda`). |
| `EMBEDDING_DIMENSION`| Yes | `384` | Dimensionality of `all-MiniLM-L6-v2`. |
| `UPLOAD_DIR` | Yes | `./uploads` | Storage directory for PDF files. |

### Frontend Variables (`frontend/.env`)

| Variable | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Production | `https://your-backend.onrender.com` | Backend REST API base URL. |

---

## 10. Installation and Local Setup

### Prerequisites
* Python 3.10, 3.11, or 3.12
* Node.js 18+ and npm
* Neon PostgreSQL account (or local PostgreSQL 16 with pgvector)

### Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
# Configure DATABASE_URL, GROQ_API_KEY, and RESEND_API_KEY in .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 11. Testing and Verification Suite

Run the automated backend test suites:

```powershell
cd backend
# 1. Pipeline and Ingestion Tests
.\venv\Scripts\python.exe tests/test_pipeline.py

# 2. 17-Question Rigorous RAG and Intent Classification Tests
.\venv\Scripts\python.exe tests/test_rag_and_intent_rigorous.py

# 3. Live Groq Cloud LLM and Resend Email Verification
.\venv\Scripts\python.exe tests/test_groq_and_resend.py
```

Verify frontend compilation:
```powershell
cd frontend
npm run build
```

---

## 12. Production Cloud Deployment (Vercel + Render + Neon)

### 12.1 Database (Neon Serverless PostgreSQL)
1. Create a free project on [neon.tech](https://neon.tech) running PostgreSQL 16.
2. Copy the connection string: `postgresql+psycopg://neondb_owner:password@ep-pooler.region.aws.neon.tech/neondb?sslmode=require`.

### 12.2 Backend (Render Web Service)
1. Connect your repository on [render.com](https://render.com).
2. Set Root Directory: `backend`.
3. Set Build Command: `pip install -r requirements.txt`.
4. Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Add Environment Variables: `DATABASE_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`.

### 12.3 Frontend (Vercel CDN)
1. Import repository on [vercel.com](https://vercel.com).
2. Set Root Directory: `frontend`.
3. Set Framework: `Vite`.
4. Add Environment Variable: `VITE_API_URL` = `https://your-backend.onrender.com`.
5. Deploy.

---

## 13. Project File Organization

```text
D:\Myproject\PROJ2-ARCHER
|-- README.md                         # Project overview, architecture, and quickstart
|-- .gitignore                        # Strict exclusion of .env, uploads, node_modules
|-- docs/
|   |-- PROJECT_DOCUMENTATION.md      # Comprehensive technical architecture and API guide
|   |-- PROJECT_STRUCTURE.md          # Directory tree and file responsibility reference
|   |-- DEPLOYMENT_GUIDE.md           # Production deployment guide (Vercel + Render + Neon)
|   |-- LOCAL_SETUP.md                # Multi-platform local setup guide
|   `-- INTERVIEW_AND_CONCEPT_GUIDE.md # NLP, RAG, ML/DL concepts and interview Q&A
|
|-- backend/                          # FastAPI Backend Engine
|   |-- .env.example                  # Environment configuration template
|   |-- requirements.txt              # Python package dependencies
|   |-- uploads/                      # PDF document storage
|   |-- tests/                        # Automated unit, RAG, and integration test suites
|   |-- scripts/                      # Database and sample paper seeding scripts
|   `-- app/
|       |-- main.py                   # FastAPI app entry point and CORS setup
|       |-- api/                      # REST API routing endpoints (auth, docs, chat, compare, contact)
|       |-- core/                     # Configuration (Pydantic BaseSettings) and logging
|       |-- db/                       # SQLAlchemy engine, sessionmaker, init_db migrations
|       |-- models/                   # SQLAlchemy ORM models (user, doc, chunk, conversation, citation)
|       |-- schemas/                  # Pydantic validation and serialization schemas
|       |-- services/                 # PyMuPDF parser, chunker, embeddings, Resend email
|       `-- rag/                      # Hybrid retriever, context builder, Groq/Ollama providers
|
`-- frontend/                         # React 18 + TypeScript + Vite Frontend
    |-- .env.example                  # Frontend environment configuration template
    |-- package.json                  # Dependencies and build scripts
    |-- tsconfig.json                 # TypeScript compiler configuration
    |-- vite.config.ts                # Vite build config with vendor chunk splitting
    `-- src/
        |-- App.tsx                   # Main router and view layout hierarchy
        |-- context/                  # UserContext (auth & rate limit), ThemeContext
        |-- components/               # Navbar, Sidebar, Modals, StatusBadge, CitationBadge
        |-- pages/                    # LandingPage, DashboardPage, UploadPage, PapersPage, ChatPage, ComparePage, InsightsPage
        `-- services/api.ts           # REST API client with automatic Bearer auth headers
```

---

## 14. Troubleshooting and Operational Guidance

1. **OpenBLAS Thread Contention on Windows**: If SentenceTransformers triggers a CPU buffer allocation error, ensure `OPENBLAS_NUM_THREADS=1` and `OMP_NUM_THREADS=1` are set.
2. **Groq Model Availability**: If `llama-3.1-8b-instant` is unavailable on a regional endpoint, configure `GROQ_MODEL=groq/compound-mini` in `backend/.env`.
3. **Database Schema Sync**: If columns are missing on a pre-existing database, `init_db()` in `session.py` runs automatic non-destructive column additions upon startup.

---

## 15. License and Resources

* **License**: MIT License
* **Repository**: [https://github.com/AuroraBytesX/ARCHER](https://github.com/AuroraBytesX/ARCHER)
* **Author Contact**: `tapashidhar2004@gmail.com`
