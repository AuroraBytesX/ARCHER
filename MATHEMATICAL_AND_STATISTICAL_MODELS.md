# ARCHER: Mathematical, Statistical, and Machine Learning Formulations

---

## 1. Introduction

This document formalizes the mathematical, statistical, and machine learning models implemented across the ARCHER system. Every algorithm is detailed with its formal mathematical equation, parameter definitions, runtime complexity, and execution location in the codebase.

---

## 2. Mathematical Models by Component

### Model 1: Dense Vector Cosine Similarity
* **Where Used**: In `backend/app/rag/retriever.py` and PostgreSQL `pgvector` index.
* **When Executed**: During semantic retrieval when querying document chunk embeddings against a user question.
* **Mathematical Formula**:
  $$\text{Cosine Similarity}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\|_2 \|\mathbf{d}\|_2} = \frac{\sum_{i=1}^{m} q_i d_i}{\sqrt{\sum_{i=1}^{m} q_i^2} \sqrt{\sum_{i=1}^{m} d_i^2}}$$
* **L2-Normalized Form** (Since all vectors in ARCHER are pre-normalized to unit sphere $\|\mathbf{e}\|_2 = 1$):
  $$S_{\text{dense}}(\mathbf{q}, \mathbf{d}) = \mathbf{q} \cdot \mathbf{d} = \sum_{i=1}^{384} q_i d_i$$
* **PostgreSQL pgvector Distance Operator**:
  $$\text{Cosine Distance}(\mathbf{q}, \mathbf{d}) = 1 - S_{\text{dense}}(\mathbf{q}, \mathbf{d})$$
* **Complexity**: $O(m)$ per vector dot product ($m = 384$). With HNSW/IVFFlat indexing, query complexity is $O(\log N)$.

---

### Model 2: BM25 Okapi Lexical Relevance Scoring
* **Where Used**: In `backend/app/rag/retriever.py` (Keyword retrieval engine).
* **When Executed**: To score exact term occurrences, acronyms (e.g. *ResNet-152*, *SGD*, *BLEU*), and mathematical symbols across document chunks.
* **Mathematical Formula**:
  $$\text{Score}_{\text{BM25}}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$
* **Parameters**:
  - $q_i$: Query term $i$ in query $Q = \{q_1, q_2, \dots, q_n\}$.
  - $f(q_i, D)$: Term frequency of $q_i$ in chunk document $D$.
  - $|D|$: Length of chunk document $D$ in words.
  - $\text{avgdl}$: Average length of all chunks in the corpus.
  - $k_1 = 1.5$: Term frequency saturation parameter.
  - $b = 0.75$: Document length normalization parameter.
* **Robertson-Spärck Jones Inverse Document Frequency (IDF)**:
  $$\text{IDF}(q_i) = \ln\left( \frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1 \right)$$
  Where $N$ is total chunks in library, and $n(q_i)$ is chunks containing term $q_i$.

---

### Model 3: Dynamic Convex Hybrid Score Combination
* **Where Used**: In `backend/app/rag/retriever.py` (`retrieve()`).
* **When Executed**: To fuse dense semantic vector rank with sparse lexical BM25 ranking.
* **Mathematical Formula**:
  $$S_{\text{hybrid}}(D, Q) = \alpha \cdot S_{\text{dense}}(D, Q) + (1 - \alpha) \cdot S_{\text{BM25}}^{\text{norm}}(D, Q)$$
* **Min-Max Normalization of BM25**:
  $$S_{\text{BM25}}^{\text{norm}}(D, Q) = \frac{S_{\text{BM25}}(D, Q) - \min_{d} S_{\text{BM25}}(d, Q)}{\max_{d} S_{\text{BM25}}(d, Q) - \min_{d} S_{\text{BM25}}(d, Q) + \epsilon}$$
* **Default Tuning Parameter**: $\alpha = 0.60$ (60% dense semantic weight, 40% lexical keyword weight).

---

### Model 4: Reciprocal Rank Fusion (RRF)
* **Where Used**: In cross-paper comparison and multi-collection search.
* **Mathematical Formula**:
  $$\text{RRF\_Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
  Where $M = \{\text{Dense Retriever}, \text{BM25 Retriever}\}$, $r_m(d)$ is the rank of chunk $d$ in system $m$, and $k = 60$ is the smoothing constant.

---

### Model 5: Epistemic Uncertainty & Rejection Boundary
* **Where Used**: In `backend/app/rag/rag_engine.py` and `nlp_classifier.py`.
* **When Executed**: Before generating an LLM response to detect whether retrieved evidence is sufficient to prevent hallucination.
* **Mathematical Decision Boundary**:
  $$\text{Response Mode} = \begin{cases} \text{Generate Grounded RAG Synthesis}, & \text{if } \max_{d \in \text{Top-}K} S_{\text{hybrid}}(d, Q) \ge \tau_{\text{evidence}} \\ \text{"The retrieved documents do not contain sufficient evidence."}, & \text{if } \max_{d \in \text{Top-}K} S_{\text{hybrid}}(d, Q) < \tau_{\text{evidence}} \end{cases}$$
* **Threshold**: $\tau_{\text{evidence}} = 0.42$.

---

### Model 6: Section-Aware Recursive Chunking & Window Stride
* **Where Used**: In `backend/app/services/chunking_service.py`.
* **Mathematical Formulation**:
  Given section token sequence $T = \langle t_1, t_2, \dots, t_L \rangle$, with chunk window size $W = 800$ tokens and overlap $O = 120$ tokens:
  $$\text{Stride } S = W - O = 800 - 120 = 680 \text{ tokens}$$
  $$\text{Total Chunks } C = \left\lceil \frac{\max(0, L - W)}{S} \right\rceil + 1$$
  $$\text{Chunk } k \text{ Token Span}: [k \cdot S, \; \min(L, \; k \cdot S + W)] \quad \text{for } k = 0, 1, \dots, C-1$$

---

## 3. Machine Learning Evaluation Metrics

```
+--------------------------+-------------------------------------------------------------------------------------+
| Metric                   | Formal Mathematical Equation                                                        |
+--------------------------+-------------------------------------------------------------------------------------+
| Precision@K              | Precision@K = |Relevant Chunks intersect Retrieved_K| / K                           |
| Recall@K                 | Recall@K = |Relevant Chunks intersect Retrieved_K| / |Total Ground Truth Relevant|   |
| Mean Reciprocal Rank     | MRR = (1 / |Q|) * sum_{i=1}^{|Q|} (1 / rank_i)                                      |
| DCG@K                    | DCG@K = sum_{i=1}^K (2^{rel_i} - 1) / log_2(i + 1)                                  |
| NDCG@K                   | NDCG@K = DCG@K / IDCG@K                                                             |
| Faithfulness Score       | F = |Verified Grounded Claims| / |Total Claims Generated by LLM|                    |
+--------------------------+-------------------------------------------------------------------------------------+
```

---

## 4. Worked Step-by-Step Numerical Example (10-Line Dataset)

### 4.1 The 10-Line Corpus Dataset
Consider the following 10-line text corpus from our ingested research papers:

```
[D1] Deeper neural networks are more difficult to train because of vanishing gradients.
[D2] We present a residual learning framework to ease the training of deep networks.
[D3] The residual mapping F(x) = H(x) - x is recast into F(x) + x with identity shortcuts.
[D4] On ImageNet, residual nets with 152 layers achieved 3.57 percent top-5 error.
[D5] The 152-layer ResNet won 1st place in the ILSVRC 2015 classification competition.
[D6] Attention mechanism in Transformer dispenses with recurrence and convolutions entirely.
[D7] Multi-head attention allows the model to jointly attend to information from different representation subspaces.
[D8] BERT is designed to pre-train deep bidirectional representations from unlabeled text.
[D9] LoRA freezes pre-trained model weights and injects trainable rank decomposition matrices.
[D10] LoRA reduces the number of trainable parameters by 10,000 times and GPU memory by 3 times.
```

---

### 4.2 User Query
$$\text{Query } Q: \text{"What is the top-5 error achieved by 152-layer residual net on ImageNet?"}$$

---

### 4.3 Step 1: Lexical BM25 Okapi Calculation
* **Query terms**: $q_1 = \text{152-layer}$, $q_2 = \text{residual}$, $q_3 = \text{error}$, $q_4 = \text{ImageNet}$.
* **Total documents** $N = 10$.
* Term document frequency $n(\text{ImageNet}) = 1$ (appears only in $D_4$).
  $$\text{IDF}(\text{ImageNet}) = \ln\left( \frac{10 - 1 + 0.5}{1 + 0.5} + 1 \right) = \ln(6.33 + 1) = \ln(7.33) \approx 1.992$$
* For $D_4$ ($|D_4| = 12$ words, $\text{avgdl} = 13.4$ words):
  $$f(\text{ImageNet}, D_4) = 1, \quad f(\text{152-layer}, D_4) = 1, \quad f(\text{residual}, D_4) = 1, \quad f(\text{error}, D_4) = 1$$
* **Calculated BM25 Score for $D_4$**:
  $$\text{Score}_{\text{BM25}}(D_4, Q) = 1.992 \times \frac{1 \times 2.5}{1 + 1.5 \times (1 - 0.75 + 0.75 \times (12/13.4))} \times 4 \approx \mathbf{7.38}$$
* **BM25 Scores for all documents**:
  - $D_4$: 7.38 (Rank 1)
  - $D_5$: 4.82 (Rank 2)
  - $D_2$: 2.15 (Rank 3)
  - $D_3$: 1.94 (Rank 4)
  - $D_1, D_6, D_7, D_8, D_9, D_{10}$: 0.00

---

### 4.4 Step 2: Dense Cosine Similarity (3-Dimensional Projection Example)
Projected unit vectors for query and candidate documents:
- $\hat{\mathbf{q}} = [0.720, 0.610, 0.330]$
- $\hat{\mathbf{d}}_4 = [0.710, 0.630, 0.310]$
- $\hat{\mathbf{d}}_5 = [0.650, 0.580, 0.490]$
- $\hat{\mathbf{d}}_8 = [0.120, 0.210, 0.970]$

**Cosine Similarity Calculations**:
$$S_{\text{dense}}(\hat{\mathbf{q}}, \hat{\mathbf{d}}_4) = (0.720 \times 0.710) + (0.610 \times 0.630) + (0.330 \times 0.310) = 0.5112 + 0.3843 + 0.1023 = \mathbf{0.9978}$$
$$S_{\text{dense}}(\hat{\mathbf{q}}, \hat{\mathbf{d}}_5) = (0.720 \times 0.650) + (0.610 \times 0.580) + (0.330 \times 0.490) = 0.4680 + 0.3538 + 0.1617 = \mathbf{0.9835}$$
$$S_{\text{dense}}(\hat{\mathbf{q}}, \hat{\mathbf{d}}_8) = (0.720 \times 0.120) + (0.610 \times 0.210) + (0.330 \times 0.970) = 0.0864 + 0.1281 + 0.3201 = \mathbf{0.5346}$$

---

### 4.5 Step 3: Hybrid Fusion Score ($\alpha = 0.60$)
Normalizing BM25 to $[0, 1]$ where $\max = 7.38$:
$$S_{\text{BM25}}^{\text{norm}}(D_4) = \frac{7.38}{7.38} = 1.000$$
$$S_{\text{BM25}}^{\text{norm}}(D_5) = \frac{4.82}{7.38} = 0.653$$

**Final Hybrid Scores**:
$$S_{\text{hybrid}}(D_4) = (0.60 \times 0.9978) + (0.40 \times 1.000) = 0.5987 + 0.4000 = \mathbf{0.9987} \quad (\text{Rank 1})$$
$$S_{\text{hybrid}}(D_5) = (0.60 \times 0.9835) + (0.40 \times 0.653) = 0.5901 + 0.2612 = \mathbf{0.8513} \quad (\text{Rank 2})$$

---

### 4.6 Step 4: Epistemic Threshold Check & Grounded Output
1. Max hybrid score is $0.9987 > \tau_{\text{evidence}} (0.42) \implies$ **Proceed with grounded RAG synthesis**.
2. **Grounded Answer Generated by ARCHER**:
   > "On the ImageNet dataset, residual networks with a depth of 152 layers achieved a **3.57% top-5 error** [Deep Residual Learning for Image Recognition, p. 1], winning 1st place in the ILSVRC 2015 classification task [Deep Residual Learning for Image Recognition, p. 2]."
