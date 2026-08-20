from typing import List, Dict, Any, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text
from app.models.chunk import Chunk
from app.models.document import Document
from app.services.embedding_service import get_embedding_provider
from app.core.config import settings
from app.core.logging import logger

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

class HybridRetriever:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_provider = get_embedding_provider()
        self.alpha = settings.HYBRID_ALPHA  # 0.6 vector, 0.4 keyword

    def retrieve(
        self,
        query: str,
        top_k: int = 8,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        year_min: Optional[int] = None,
        year_max: Optional[int] = None,
        mode: str = "hybrid"
    ) -> List[Dict[str, Any]]:
        """
        Executes hybrid, vector-only, or keyword-only retrieval.
        Applies metadata filters (collection, documents, year).
        """
        # 1. Base Query with filters
        query_filters = [Document.status == "READY"]
        if collection_id:
            query_filters.append(Document.collection_id == collection_id)
        if document_ids:
            query_filters.append(Document.id.in_(document_ids))
        if year_min:
            query_filters.append(Document.year >= year_min)
        if year_max:
            query_filters.append(Document.year <= year_max)

        # 2. Get candidate chunks
        db_query = (
            self.db.query(Chunk, Document)
            .join(Document, Chunk.document_id == Document.id)
            .filter(and_(*query_filters))
        )

        all_candidates = db_query.all()
        if not all_candidates:
            return []

        # If keyword only
        if mode == "keyword":
            scored = self._keyword_search(query, all_candidates)
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]

        # 3. Vector Embedding
        query_vector = self.embedding_provider.embed_query(query)

        # Check if we can run native pgvector search on PostgreSQL
        is_postgres = "postgresql" in settings.DATABASE_URL.lower()

        if mode == "vector":
            scored = self._vector_search(query_vector, all_candidates)
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]

        # Hybrid Search: Weighted Combination of Vector & Keyword
        vector_results = self._vector_search(query_vector, all_candidates)
        keyword_results = self._keyword_search(query, all_candidates)

        # Index by chunk_id
        vec_dict = {item["chunk_id"]: item for item in vector_results}
        kw_dict = {item["chunk_id"]: item for item in keyword_results}

        merged_results: List[Dict[str, Any]] = []
        all_chunk_ids = set(vec_dict.keys()).union(set(kw_dict.keys()))

        for cid in all_chunk_ids:
            v_score = vec_dict.get(cid, {}).get("score", 0.0)
            k_score = kw_dict.get(cid, {}).get("score", 0.0)

            # Combined hybrid score
            hybrid_score = (self.alpha * v_score) + ((1.0 - self.alpha) * k_score)

            base_item = vec_dict.get(cid) or kw_dict.get(cid)
            res_item = dict(base_item)
            res_item["score"] = round(float(hybrid_score), 4)
            res_item["vector_score"] = round(float(v_score), 4)
            res_item["keyword_score"] = round(float(k_score), 4)
            merged_results.append(res_item)

        merged_results.sort(key=lambda x: x["score"], reverse=True)
        return merged_results[:top_k]

    def _vector_search(self, query_vector: List[float], candidates: List[Any]) -> List[Dict[str, Any]]:
        results = []
        for chunk, doc in candidates:
            chunk_embedding = chunk.embedding
            if chunk_embedding is None:
                continue

            # Compute similarity
            sim = cosine_similarity(query_vector, chunk_embedding)
            # Normalize to 0-1 range
            normalized_score = max(0.0, min(1.0, (sim + 1.0) / 2.0))

            results.append({
                "chunk_id": chunk.id,
                "document_id": doc.id,
                "paper_title": doc.title,
                "authors": doc.authors,
                "year": doc.year,
                "page_number": chunk.page_number,
                "section": chunk.section or "General",
                "content": chunk.content,
                "score": round(float(normalized_score), 4)
            })
        return results

    def _keyword_search(self, query: str, candidates: List[Any]) -> List[Dict[str, Any]]:
        query_terms = [t.lower() for t in query.strip().split() if len(t) > 2]
        if not query_terms:
            query_terms = [query.lower()]

        results = []
        for chunk, doc in candidates:
            content_lower = chunk.content.lower()
            title_lower = doc.title.lower()

            term_matches = sum(1 for term in query_terms if term in content_lower)
            title_matches = sum(2 for term in query_terms if term in title_lower)
            
            total_matches = term_matches + title_matches
            if total_matches == 0:
                raw_score = 0.0
            else:
                raw_score = min(1.0, (total_matches / max(len(query_terms), 1)))

            results.append({
                "chunk_id": chunk.id,
                "document_id": doc.id,
                "paper_title": doc.title,
                "authors": doc.authors,
                "year": doc.year,
                "page_number": chunk.page_number,
                "section": chunk.section or "General",
                "content": chunk.content,
                "score": round(float(raw_score), 4)
            })
        return results
