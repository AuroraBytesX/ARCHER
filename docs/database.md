# ARCHER Database Schema & Entity Relationships

The storage layer is built on PostgreSQL with the `pgvector` extension for dense embedding storage, with SQLAlchemy ORM and Alembic migrations.

---

## 1. Schema Diagram

```
   ┌──────────────┐
   │    users     │
   ├──────────────┤
   │ id (PK)      │◀──────┐
   │ email        │       │
   │ created_at   │       │
   └──────────────┘       │
          │               │
          ▼               │
   ┌──────────────┐       │
   │ collections  │       │
   ├──────────────┤       │
   │ id (PK)      │       │
   │ user_id (FK) ├───────┤
   │ name         │       │
   │ created_at   │       │
   └──────────────┘       │
          │               │
          ▼               │
   ┌──────────────┐       │
   │  documents   │       │
   ├──────────────┤       │
   │ id (PK)      │       │
   │ collection_id│       │
   │ title        │       │
   │ authors      │       │
   │ abstract     │       │
   │ year         │       │
   │ doi          │       │
   │ filename     │       │
   │ file_url     │       │
   │ page_count   │       │
   │ status       │       │
   │ content_hash │       │
   │ created_at   │       │
   └──────┬───────┘       │
          │               │
          ├───────────────────────────────┐
          ▼                               ▼
   ┌──────────────┐                ┌──────────────┐
   │    chunks    │                │  summaries   │
   ├──────────────┤                ├──────────────┤
   │ id (PK)      │                │ id (PK)      │
   │ document_id  │                │ document_id  │
   │ chunk_index  │                │ objective    │
   │ page_number  │                │ methodology  │
   │ section      │                │ datasets     │
   │ content      │                │ findings     │
   │ token_count  │                │ limitations  │
   │ embedding    │                │ future_work  │
   │ (vector 384) │                │ summary      │
   └──────────────┘                │ created_at   │
                                   └──────────────┘
```

---

## 2. Table Definitions

### `users`
- `id`: UUID (Primary Key, Indexed)
- `email`: VARCHAR(255) (Unique, Indexed)
- `created_at`: TIMESTAMP

### `collections`
- `id`: UUID (Primary Key, Indexed)
- `user_id`: UUID (Foreign Key `users.id` ON DELETE CASCADE, Indexed)
- `name`: VARCHAR(255) (Indexed)
- `created_at`: TIMESTAMP

### `documents`
- `id`: UUID (Primary Key, Indexed)
- `collection_id`: UUID (Foreign Key `collections.id` ON DELETE SET NULL, Indexed)
- `title`: VARCHAR(500) (Indexed)
- `authors`: VARCHAR(500)
- `abstract`: TEXT
- `year`: INTEGER (Indexed)
- `doi`: VARCHAR(255)
- `filename`: VARCHAR(255)
- `file_url`: VARCHAR(1000)
- `page_count`: INTEGER
- `status`: VARCHAR(50) (`UPLOADED`, `PROCESSING`, `INDEXING`, `READY`, `FAILED`, Indexed)
- `error_message`: TEXT
- `content_hash`: VARCHAR(64) (Unique SHA-256 hash, Indexed)
- `created_at`: TIMESTAMP (Indexed)

### `chunks`
- `id`: UUID (Primary Key, Indexed)
- `document_id`: UUID (Foreign Key `documents.id` ON DELETE CASCADE, Indexed)
- `chunk_index`: INTEGER (Indexed)
- `page_number`: INTEGER (Indexed)
- `section`: VARCHAR(255) (Indexed)
- `content`: TEXT
- `token_count`: INTEGER
- `embedding`: Vector(384) (pgvector dense vector column)

### `summaries`
- `id`: UUID (Primary Key, Indexed)
- `document_id`: UUID (Foreign Key `documents.id` ON DELETE CASCADE, Unique, Indexed)
- `objective`: TEXT
- `methodology`: TEXT
- `datasets`: TEXT
- `findings`: TEXT
- `limitations`: TEXT
- `future_work`: TEXT
- `summary`: TEXT (150-250 words)
- `created_at`: TIMESTAMP

### `conversations` & `messages`
- `conversations`: `id`, `user_id`, `title`, `created_at`
- `messages`: `id`, `conversation_id` (FK), `role` (`user`, `assistant`), `content`, `citations_json`, `created_at`
