# ARCHER Retrieval & RAG Pipeline

ARCHER implements a zero-hallucination, citation-grounded Retrieval-Augmented Generation (RAG) engine designed for scholarly multi-document question answering.

---

## 1. Grounded RAG Pipeline

```
[ User Query ]
      │
      ▼
[ Query Embedding: Sentence Transformers (384-dim) ]
      │
      ├──► [ pgvector Cosine Similarity Search (Weight: 0.6) ]
      │                         │
      ├──► [ Token Keyword / BM25 Search      (Weight: 0.4) ]
      │                         │
      └─────────────────────────┴─────────────► [ Reciprocal Score Fusion ]
                                                       │
                                                       ▼
                                            [ Filtered Top-K (K=4) ]
                                                       │
                                                       ▼
                                            [ Context & Evidence Assembly ]
                                            - Tag: [Paper Title, p. X]
                                            - Max 450 chars/excerpt (TPM Safety)
                                                       │
                                                       ▼
                                            [ LLM: Groq (gpt-oss-20b/120b) ]
                                            - Natural Grounding System Prompt
                                            - Reasoning Tag (<think>) Stripping
                                            - Output: Synthesized Response
                                                       │
                                                       ▼
                                            [ Frontend MarkdownRenderer ]
                                            - Renders Styled UI Tables & Cards
                                            - Links [Title, p. X] -> Page & Chunk
                                            - Calculates Evidence Coverage Score
```

---

## 2. Citation Grounding Rules

1. **Strict Context Adherence**: The LLM is commanded to formulate answers solely from retrieved evidence.
2. **Citation Syntax**: Any factual statement or empirical finding is cited as:
   ```markdown
   The Transformer architecture discards recurrence in favor of multi-head self-attention [Attention Is All You Need, p. 3].
   ```
3. **Traceability**: Each citation is structured with:
   - `document_id`
   - `page_number`
   - `chunk_id`
   - `section`
   - `quote` (exact supporting text excerpt)
4. **Evidence Confidence Metric**:
   $$\text{Evidence Score} = \frac{1}{K} \sum_{i=1}^{K} \text{CosineSimilarity}(q, c_i)$$
   Displayed in the UI as **High Grounding** ($\ge 70\%$), **Moderate Grounding** ($40-69\%$), or **Low Grounding** ($< 40\%$).
