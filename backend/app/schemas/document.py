from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CollectionBase(BaseModel):
    name: str

class CollectionCreate(CollectionBase):
    pass

class CollectionResponse(CollectionBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChunkResponse(BaseModel):
    id: str
    document_id: str
    chunk_index: int
    page_number: int
    section: Optional[str] = "General"
    content: str
    token_count: int
    model_config = ConfigDict(from_attributes=True)

class DocumentBase(BaseModel):
    title: str
    authors: Optional[str] = None
    abstract: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    collection_id: Optional[str] = None

class DocumentCreate(DocumentBase):
    filename: str
    file_url: Optional[str] = None
    page_count: int = 0
    content_hash: str

class DocumentResponse(DocumentBase):
    id: str
    filename: str
    file_url: Optional[str] = None
    page_count: int
    status: str
    error_message: Optional[str] = None
    content_hash: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    chunks_count: int = 0
    has_summary: bool = False

class DocumentListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: List[DocumentResponse]

class BatchUploadItem(BaseModel):
    filename: str
    status: str # "SUCCESS", "DUPLICATE", "FAILED", "IGNORED"
    document: Optional[DocumentResponse] = None
    message: Optional[str] = None

class BatchUploadResponse(BaseModel):
    total_files: int
    successful_count: int
    duplicate_count: int
    failed_count: int
    results: List[BatchUploadItem]
