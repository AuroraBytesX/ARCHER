import os
from abc import ABC, abstractmethod
from typing import List, Union
import numpy as np
import torch
from app.core.config import settings
from app.core.logging import logger

# Accelerate CPU tensor multiplication across cores
_num_threads = min(8, os.cpu_count() or 4)
os.environ["OPENBLAS_NUM_THREADS"] = str(_num_threads)
os.environ["OMP_NUM_THREADS"] = str(_num_threads)
os.environ["MKL_NUM_THREADS"] = str(_num_threads)
try:
    torch.set_num_threads(_num_threads)
except Exception:
    pass

class EmbeddingProvider(ABC):
    @abstractmethod
    def embed_documents(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        pass

class SentenceTransformerProvider(EmbeddingProvider):
    _model = None

    def __init__(self, model_name: str = None, device: str = None):
        self.model_name = model_name or settings.EMBEDDING_MODEL_NAME
        self.device = device or settings.EMBEDDING_DEVICE

    def _get_model(self):
        if SentenceTransformerProvider._model is None:
            try:
                logger.info(f"Loading SentenceTransformer model: {self.model_name} on {self.device}")
                from sentence_transformers import SentenceTransformer
                SentenceTransformerProvider._model = SentenceTransformer(self.model_name, device=self.device)
            except Exception as e:
                logger.warning(f"Unable to load SentenceTransformer ({e}). Using lightweight fallback provider.")
                return None
        return SentenceTransformerProvider._model

    def embed_documents(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        if not texts:
            return []
        model = self._get_model()
        if model is None:
            fallback = MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
            return fallback.embed_documents(texts)

        all_embeddings: List[List[float]] = []
        try:
            with torch.inference_mode():
                # Keep batch size conservative to preserve memory on cloud free tiers
                actual_batch = min(batch_size, 32)
                for i in range(0, len(texts), actual_batch):
                    batch = texts[i:i + actual_batch]
                    embeddings = model.encode(
                        batch,
                        batch_size=actual_batch,
                        normalize_embeddings=True,
                        show_progress_bar=False,
                        convert_to_numpy=True
                    )
                    all_embeddings.extend(embeddings.tolist())
            return all_embeddings
        except Exception as e:
            logger.warning(f"Error during batched embedding ({e}), using deterministic fallback vectors.")
            fallback = MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
            return fallback.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        model = self._get_model()
        if model is None:
            fallback = MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
            return fallback.embed_query(text)
        try:
            with torch.inference_mode():
                embedding = model.encode(text, normalize_embeddings=True, show_progress_bar=False, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.warning(f"Error during query embedding ({e}), using fallback vector.")
            fallback = MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
            return fallback.embed_query(text)

class MockFallbackEmbeddingProvider(EmbeddingProvider):
    """
    Fallback deterministic embedding provider for testing environments
    if sentence-transformers is loading or in lightweight test mode.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self.embed_query(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        # Deterministic pseudo-embedding based on hash & character frequencies
        v = np.zeros(self.dim, dtype=np.float32)
        for i, char in enumerate(text[:self.dim]):
            v[i % self.dim] += (ord(char) * (i + 1)) % 100
        norm = np.linalg.norm(v)
        if norm > 0:
            v = v / norm
        return v.tolist()

def get_embedding_provider() -> EmbeddingProvider:
    if settings.EMBEDDING_PROVIDER == "sentence_transformers":
        try:
            return SentenceTransformerProvider()
        except Exception as e:
            logger.warning(f"Failed to load SentenceTransformerProvider, falling back to mock provider: {e}")
            return MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
    return MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)
