import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add app to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.models.user import User
from app.models.collection import Collection
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.models.summary import Summary
from app.services.pdf_service import clean_extracted_text, detect_section_header, calculate_sha256
from app.services.chunking_service import ChunkingService, estimate_tokens
from app.services.embedding_service import get_embedding_provider, MockFallbackEmbeddingProvider
from app.rag.retriever import HybridRetriever, cosine_similarity
from app.rag.context_builder import ContextBuilder
from app.services.summary_service import SummaryService
from app.services.comparison_service import ComparisonService
from app.services.insight_service import InsightService
from app.main import app

# Setup test DB (SQLite in memory with StaticPool)
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_text_cleaning_and_section_detection():
    raw_text = "This is a trans-\nformer model.\n\n\n\nMethodology\nWe propose an architecture."
    cleaned = clean_extracted_text(raw_text)
    assert "transformer model." in cleaned
    assert "\n\n\n" not in cleaned

    assert detect_section_header("Abstract") == "Abstract"
    assert detect_section_header("3. Methodology") == "Methodology"
    assert detect_section_header("Results and Discussion") == "Results & Discussion"
    assert detect_section_header("Limitations and Ethics") == "Limitations"
    assert detect_section_header("Random sentence that is not a header") is None

def test_chunking_service():
    chunker = ChunkingService(chunk_size=100, chunk_overlap=20)
    pages_data = [
        {
            "page_number": 1,
            "raw_text": "Sample text",
            "sections": [
                {
                    "section": "Introduction",
                    "content": "Deep learning architectures have transformed natural language processing. " * 15
                }
            ]
        }
    ]
    chunks = chunker.chunk_document("doc-123", pages_data)
    assert len(chunks) >= 1
    for c in chunks:
        assert c["document_id"] == "doc-123"
        assert c["page_number"] == 1
        assert c["section"] == "Introduction"
        assert c["token_count"] > 0
        assert "chunk_index" in c

def test_embedding_provider_and_similarity():
    provider = MockFallbackEmbeddingProvider(dim=384)
    v1 = provider.embed_query("Transformer attention mechanisms")
    v2 = provider.embed_query("Transformer attention mechanisms")
    v3 = provider.embed_query("Quantum computing qubits")

    assert len(v1) == 384
    sim_identical = cosine_similarity(v1, v2)
    assert pytest.approx(sim_identical, 0.001) == 1.0

    batch = provider.embed_documents(["doc 1", "doc 2", "doc 3"])
    assert len(batch) == 3

def test_hybrid_retriever_and_context_builder(db_session):
    doc = Document(
        id="doc-test-1",
        title="Attention Is All You Need",
        authors="Vaswani et al.",
        year=2017,
        filename="attention.pdf",
        content_hash="hash-123",
        status=DocumentStatus.READY.value,
        page_count=15
    )
    db_session.add(doc)
    db_session.commit()

    embed_provider = MockFallbackEmbeddingProvider(dim=384)
    c1_content = "The Transformer is the first transduction model relying entirely on self-attention."
    c2_content = "Multi-head attention allows the model to jointly attend to information at different positions."

    chunk1 = Chunk(
        id="c-1",
        document_id=doc.id,
        chunk_index=0,
        page_number=1,
        section="Abstract",
        content=c1_content,
        token_count=15,
        embedding=embed_provider.embed_query(c1_content)
    )
    chunk2 = Chunk(
        id="c-2",
        document_id=doc.id,
        chunk_index=1,
        page_number=3,
        section="Methodology",
        content=c2_content,
        token_count=18,
        embedding=embed_provider.embed_query(c2_content)
    )
    db_session.add_all([chunk1, chunk2])
    db_session.commit()

    retriever = HybridRetriever(db_session)
    retriever.embedding_provider = embed_provider

    results = retriever.retrieve(query="self-attention mechanism", top_k=5, mode="hybrid")
    assert len(results) >= 1
    assert results[0]["document_id"] == "doc-test-1"

    prompt, citations, score = ContextBuilder.build_context_and_prompt("What is self-attention?", results)
    assert len(citations) >= 1
    assert citations[0].citation_label in ["[Attention Is All You Need, p. 1]", "[Attention Is All You Need, p. 3]"]
    assert score > 0.0

def test_full_api_endpoints_suite(client, db_session):
    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["service"] == settings.PROJECT_NAME

    # 2. Collections
    res_col = client.post("/api/collections", json={"name": "NLP Papers"})
    assert res_col.status_code == 200
    col_id = res_col.json()["id"]

    # 3. Documents Seed
    embed_provider = MockFallbackEmbeddingProvider(dim=384)
    doc1 = Document(
        id="doc-api-1",
        collection_id=col_id,
        title="BERT: Pre-training of Deep Bidirectional Transformers",
        authors="Devlin et al.",
        year=2018,
        filename="bert.pdf",
        content_hash="hash-bert-1",
        status=DocumentStatus.READY.value,
        page_count=16,
        abstract="We introduce a new language representation model called BERT."
    )
    doc2 = Document(
        id="doc-api-2",
        collection_id=col_id,
        title="GPT-3: Language Models are Few-Shot Learners",
        authors="Brown et al.",
        year=2020,
        filename="gpt3.pdf",
        content_hash="hash-gpt3-2",
        status=DocumentStatus.READY.value,
        page_count=32,
        abstract="We train GPT-3, an autoregressive language model with 175 billion parameters."
    )
    db_session.add_all([doc1, doc2])
    db_session.commit()

    chunk1 = Chunk(
        id="c-bert-1",
        document_id=doc1.id,
        chunk_index=0,
        page_number=1,
        section="Abstract",
        content="BERT stands for Bidirectional Encoder Representations from Transformers.",
        token_count=12,
        embedding=embed_provider.embed_query("BERT bidirectional encoder")
    )
    chunk2 = Chunk(
        id="c-gpt-1",
        document_id=doc2.id,
        chunk_index=0,
        page_number=1,
        section="Abstract",
        content="GPT-3 achieves strong performance on NLP tasks without task-specific fine-tuning.",
        token_count=14,
        embedding=embed_provider.embed_query("GPT-3 few-shot language models")
    )
    db_session.add_all([chunk1, chunk2])
    db_session.commit()

    # 4. List documents
    res_list = client.get("/api/documents")
    assert res_list.status_code == 200
    assert res_list.json()["total"] == 2

    # 5. Document detail
    res_det = client.get(f"/api/documents/{doc1.id}")
    assert res_det.status_code == 200
    assert res_det.json()["chunks_count"] == 1

    # 6. Search
    res_search = client.get("/api/search?q=BERT&mode=keyword")
    assert res_search.status_code == 200
    assert res_search.json()["total_results"] >= 1

    # 7. Summary generation
    res_sum = client.post(f"/api/summaries/{doc1.id}")
    assert res_sum.status_code == 200
    assert res_sum.json()["document_id"] == doc1.id

    # 8. Comparison
    res_comp = client.post("/api/compare", json={"document_ids": [doc1.id, doc2.id]})
    assert res_comp.status_code == 200
    assert len(res_comp.json()["papers"]) == 2
    assert len(res_comp.json()["comparison_table"]) >= 5

    # 9. Insights & Research gaps
    res_ins = client.get("/api/insights")
    assert res_ins.status_code == 200
    assert res_ins.json()["total_papers"] == 2
    assert len(res_ins.json()["years_distribution"]) >= 1

    res_gaps = client.post("/api/insights/gaps", json={"document_ids": [doc1.id, doc2.id]})
    assert res_gaps.status_code == 200
    assert len(res_gaps.json()["gaps"]) >= 1
    assert "human verification" in res_gaps.json()["disclaimer"]
