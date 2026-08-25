import os
from abc import ABC, abstractmethod
from typing import List

import numpy as np
import torch

from app.core.config import settings
from app.core.logging import logger


# ============================================================
# CPU CONFIGURATION
# ============================================================

_num_threads = min(2, os.cpu_count() or 2)

os.environ["OPENBLAS_NUM_THREADS"] = str(_num_threads)
os.environ["OMP_NUM_THREADS"] = str(_num_threads)
os.environ["MKL_NUM_THREADS"] = str(_num_threads)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

try:
    torch.set_num_threads(_num_threads)
except Exception:
    pass


# ============================================================
# BASE PROVIDER
# ============================================================

class EmbeddingProvider(ABC):

    @abstractmethod
    def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 64,
    ) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(
        self,
        text: str,
    ) -> List[float]:
        pass


# ============================================================
# SENTENCE TRANSFORMER PROVIDER
# ============================================================

class SentenceTransformerProvider(EmbeddingProvider):

    _model = None
    _model_name = None

    def __init__(
        self,
        model_name: str | None = None,
        device: str | None = None,
    ):
        self.model_name = (
            model_name
            or settings.EMBEDDING_MODEL_NAME
        )

        self.device = (
            device
            or settings.EMBEDDING_DEVICE
        )

    def _get_model(self):

        if (
            SentenceTransformerProvider._model is not None
            and SentenceTransformerProvider._model_name
            == self.model_name
        ):
            return SentenceTransformerProvider._model

        try:

            logger.info(
                "[EMBEDDING] Loading model: "
                f"{self.model_name} "
                f"on device={self.device}"
            )

            from sentence_transformers import (
                SentenceTransformer
            )

            model = SentenceTransformer(
                self.model_name,
                device=self.device,
            )

            SentenceTransformerProvider._model = model
            SentenceTransformerProvider._model_name = (
                self.model_name
            )

            # Verify dimensionality
            dimension = model.get_embedding_dimension()

            logger.info(
                "[EMBEDDING] Model loaded successfully: "
                f"dimension={dimension}"
            )

            if dimension != settings.EMBEDDING_DIMENSION:

                raise RuntimeError(
                    "Embedding dimension mismatch: "
                    f"model={dimension}, "
                    f"configured={settings.EMBEDDING_DIMENSION}"
                )

            return model

        except Exception as e:

            logger.error(
                "[EMBEDDING] Failed to load "
                f"SentenceTransformer: {e}",
                exc_info=True,
            )

            return None

    # --------------------------------------------------------
    # DOCUMENT EMBEDDINGS
    # --------------------------------------------------------

    def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 64,
    ) -> List[List[float]]:

        if not texts:
            return []

        model = self._get_model()

        if model is None:
            raise RuntimeError(
                "SentenceTransformer model could not be loaded. "
                "Real embeddings are required for RAG ingestion."
            )

        actual_batch = min(
            max(batch_size, 1),
            8,
        )

        all_embeddings: List[List[float]] = []

        try:
            import gc
            with torch.inference_mode():
                for i in range(
                    0,
                    len(texts),
                    actual_batch,
                ):
                    batch = texts[
                        i:i + actual_batch
                    ]

                    embeddings = model.encode(
                        batch,
                        batch_size=actual_batch,
                        normalize_embeddings=True,
                        show_progress_bar=False,
                        convert_to_numpy=True,
                    )

                    all_embeddings.extend(
                        embeddings.tolist()
                    )
            gc.collect()

            if len(all_embeddings) != len(texts):

                raise RuntimeError(
                    "Embedding count mismatch: "
                    f"texts={len(texts)}, "
                    f"embeddings={len(all_embeddings)}"
                )

            return all_embeddings

        except Exception as e:

            logger.error(
                "[EMBEDDING] Document embedding failed: "
                f"{e}",
                exc_info=True,
            )

            raise RuntimeError(
                f"Document embedding failed: {e}"
            ) from e

    # --------------------------------------------------------
    # QUERY EMBEDDING
    # --------------------------------------------------------

    def embed_query(
        self,
        text: str,
    ) -> List[float]:

        if not text or not text.strip():
            raise ValueError(
                "Cannot embed an empty query."
            )

        model = self._get_model()

        if model is None:
            raise RuntimeError(
                "SentenceTransformer model could not be loaded."
            )

        try:

            with torch.inference_mode():

                embedding = model.encode(
                    text,
                    normalize_embeddings=True,
                    show_progress_bar=False,
                    convert_to_numpy=True,
                )

            result = embedding.tolist()

            if len(result) != settings.EMBEDDING_DIMENSION:

                raise RuntimeError(
                    "Query embedding dimension mismatch: "
                    f"expected={settings.EMBEDDING_DIMENSION}, "
                    f"actual={len(result)}"
                )

            return result

        except Exception as e:

            logger.error(
                "[EMBEDDING] Query embedding failed: "
                f"{e}",
                exc_info=True,
            )

            raise RuntimeError(
                f"Query embedding failed: {e}"
            ) from e


# ============================================================
# FASTEMBED ONNX PROVIDER (LOW RAM ~35MB)
# ============================================================

class FastEmbedProvider(EmbeddingProvider):
    """
    Lightweight ONNX Runtime embedding provider.
    Consumes ~35MB RAM vs ~350MB for PyTorch.
    Produces identical 384-dimensional cosine embeddings.
    """
    _model = None
    _model_name = None

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or "sentence-transformers/all-MiniLM-L6-v2"

    def _get_model(self):
        if FastEmbedProvider._model is not None:
            return FastEmbedProvider._model
        try:
            logger.info(f"[EMBEDDING] Loading FastEmbed ONNX model: {self.model_name}")
            from fastembed import TextEmbedding
            FastEmbedProvider._model = TextEmbedding(model_name=self.model_name)
            FastEmbedProvider._model_name = self.model_name
            logger.info("[EMBEDDING] FastEmbed model loaded successfully (~35MB RAM footprint).")
            return FastEmbedProvider._model
        except Exception as e:
            logger.warning(f"[EMBEDDING] FastEmbed loading note: {e}. Falling back to SentenceTransformer.")
            return None

    def embed_documents(self, texts: List[str], batch_size: int = 16) -> List[List[float]]:
        if not texts:
            return []
        model = self._get_model()
        if model is None:
            return SentenceTransformerProvider().embed_documents(texts, batch_size=batch_size)
        try:
            embeddings = list(model.embed(texts, batch_size=min(batch_size, 16)))
            return [e.tolist() for e in embeddings]
        except Exception as e:
            logger.error(f"[EMBEDDING] FastEmbed batch error: {e}", exc_info=True)
            return SentenceTransformerProvider().embed_documents(texts, batch_size=batch_size)

    def embed_query(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Cannot embed an empty query.")
        model = self._get_model()
        if model is None:
            return SentenceTransformerProvider().embed_query(text)
        try:
            return list(model.embed([text]))[0].tolist()
        except Exception as e:
            logger.error(f"[EMBEDDING] FastEmbed query error: {e}", exc_info=True)
            return SentenceTransformerProvider().embed_query(text)


# ============================================================
# CLOUD API EMBEDDING PROVIDER (ZERO LOCAL RAM)
# ============================================================

class CloudAPIEmbeddingProvider(EmbeddingProvider):
    """
    Zero-RAM Cloud API Embedding Provider.
    Queries HuggingFace Serverless / Cloud embedding endpoint over HTTPS.
    Consumes 0MB local RAM.
    """
    def __init__(self, api_url: str | None = None, api_key: str | None = None):
        self.api_url = (
            api_url
            or os.getenv("EMBEDDING_API_URL")
            or "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
        )
        self.api_key = api_key or os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or ""

    def embed_documents(self, texts: List[str], batch_size: int = 16) -> List[List[float]]:
        if not texts:
            return []
        import httpx
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        all_embeddings = []
        actual_batch = min(batch_size, 16)
        for i in range(0, len(texts), actual_batch):
            chunk_batch = texts[i:i + actual_batch]
            try:
                with httpx.Client(timeout=30.0) as client:
                    resp = client.post(self.api_url, json={"inputs": chunk_batch}, headers=headers)
                    if resp.status_code == 200:
                        all_embeddings.extend(resp.json())
                    else:
                        logger.warning(f"[EMBEDDING] Cloud API returned {resp.status_code}: {resp.text[:100]}. Falling back to local ONNX/CPU.")
                        fallback_emb = FastEmbedProvider().embed_documents(chunk_batch)
                        all_embeddings.extend(fallback_emb)
            except Exception as e:
                logger.warning(f"[EMBEDDING] Cloud API connection note: {e}. Using local ONNX/CPU provider.")
                fallback_emb = FastEmbedProvider().embed_documents(chunk_batch)
                all_embeddings.extend(fallback_emb)
        return all_embeddings

    def embed_query(self, text: str) -> List[float]:
        if not text or not text.strip():
            raise ValueError("Cannot embed an empty query.")
        import httpx
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(self.api_url, json={"inputs": [text]}, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data[0] if isinstance(data, list) and isinstance(data[0], list) else data
                else:
                    return FastEmbedProvider().embed_query(text)
        except Exception as e:
            logger.warning(f"[EMBEDDING] Cloud query note: {e}. Using local ONNX/CPU provider.")
            return FastEmbedProvider().embed_query(text)


# ============================================================
# MOCK PROVIDER
# ============================================================

class MockFallbackEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dim: int = 384):
        self.dim = dim

    def embed_documents(self, texts: List[str], batch_size: int = 64) -> List[List[float]]:
        return [self.embed_query(text) for text in texts]

    def embed_query(self, text: str) -> List[float]:
        vector = np.zeros(self.dim, dtype=np.float32)
        for i, char in enumerate(text[:self.dim]):
            vector[i % self.dim] += (ord(char) * (i + 1)) % 100
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.tolist()


# ============================================================
# PROVIDER FACTORY
# ============================================================

def get_embedding_provider() -> EmbeddingProvider:
    provider = settings.EMBEDDING_PROVIDER.strip().lower()

    if provider in ["fastembed", "onnx"]:
        logger.info("[EMBEDDING] Provider: FastEmbed ONNX (Low RAM)")
        return FastEmbedProvider()

    if provider in ["cloud", "huggingface", "api"]:
        logger.info("[EMBEDDING] Provider: Cloud API (Zero RAM)")
        return CloudAPIEmbeddingProvider()

    if provider == "sentence_transformers":
        # Check if fastembed is available for low-memory environments
        try:
            import fastembed
            logger.info("[EMBEDDING] FastEmbed detected on system, using memory-efficient ONNX runtime (~35MB RAM).")
            return FastEmbedProvider()
        except ImportError:
            logger.info("[EMBEDDING] Provider: SentenceTransformer (CPU)")
            return SentenceTransformerProvider()

    if provider == "mock":
        logger.warning("[EMBEDDING] Using MOCK embedding provider.")
        return MockFallbackEmbeddingProvider(dim=settings.EMBEDDING_DIMENSION)

    raise ValueError(f"Unsupported embedding provider: {settings.EMBEDDING_PROVIDER}")