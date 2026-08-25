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
# MOCK PROVIDER
# ============================================================

class MockFallbackEmbeddingProvider(
    EmbeddingProvider
):
    """
    Deterministic test-only embedding provider.

    IMPORTANT:
    Do not use this provider for production RAG.
    """

    def __init__(
        self,
        dim: int = 384,
    ):
        self.dim = dim

    def embed_documents(
        self,
        texts: List[str],
        batch_size: int = 64,
    ) -> List[List[float]]:

        return [
            self.embed_query(text)
            for text in texts
        ]

    def embed_query(
        self,
        text: str,
    ) -> List[float]:

        vector = np.zeros(
            self.dim,
            dtype=np.float32,
        )

        for i, char in enumerate(
            text[:self.dim]
        ):

            vector[
                i % self.dim
            ] += (
                ord(char) * (i + 1)
            ) % 100

        norm = np.linalg.norm(vector)

        if norm > 0:
            vector = vector / norm

        return vector.tolist()


# ============================================================
# PROVIDER FACTORY
# ============================================================

def get_embedding_provider() -> EmbeddingProvider:

    provider = (
        settings.EMBEDDING_PROVIDER
        .strip()
        .lower()
    )

    if provider == "sentence_transformers":

        logger.info(
            "[EMBEDDING] Provider: "
            "SentenceTransformer"
        )

        return SentenceTransformerProvider()

    if provider == "mock":

        logger.warning(
            "[EMBEDDING] Using MOCK embedding "
            "provider."
        )

        return MockFallbackEmbeddingProvider(
            dim=settings.EMBEDDING_DIMENSION
        )

    raise ValueError(
        "Unsupported embedding provider: "
        f"{settings.EMBEDDING_PROVIDER}"
    )