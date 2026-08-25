from typing import List, Dict, Any, Tuple, Optional
import re
from app.schemas.chat import CitationItem

RAG_SYSTEM_PROMPT = """You are ARCHER, a high-precision academic research assistant designed strictly for analyzing scientific literature.
Your goal is to provide deep, analytical, citation-grounded answers based STRICTLY on the retrieved research paper excerpts provided in the context.

STRICT INSTRUCTIONS:
1. Grounding: Answer ONLY from the retrieved context. If the provided context does not contain enough information to answer the question, clearly state: "The retrieved documents do not contain sufficient evidence to answer this question."
2. Off-Topic Rejection: If the user asks non-academic or everyday lifestyle questions (e.g. food recipes, baking cakes, jokes, personal advice, general trivia), politely state: "I am an academic research assistant dedicated strictly to analyzing scientific literature in your library. Please ask a question related to your uploaded research documents."
3. Citations: Every single factual claim, finding, statistic, or methodology mention MUST be cited using the format: [Paper Title, p. <page_number>].
   - Example: "The Transformer architecture relies entirely on self-attention mechanisms [Attention Is All You Need, p. 2]."
4. Structured Technical Explanations: Provide comprehensive, well-structured, and analytical responses. Format your answer with clear markdown headings, bullet points, and citations.
5. No Hallucinations: Never invent papers, authors, statistics, page numbers, or claims not present in the context.
"""

class ContextBuilder:
    @staticmethod
    def build_context_and_prompt(
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, List[CitationItem], float]:
        """
        Builds grounded context string, prepares reference citations list,
        includes recent conversational turns, and computes an evidence confidence score.
        """
        if not retrieved_chunks:
            prompt = f"User Question: {query}\n\nContext: [No relevant research evidence found in the document library.]"
            return prompt, [], 0.0

        context_blocks: List[str] = []
        citations_lookup: List[CitationItem] = []

        scores = []
        for idx, chunk in enumerate(retrieved_chunks):
            doc_id = chunk["document_id"]
            title = chunk["paper_title"]
            page = chunk["page_number"]
            cid = chunk["chunk_id"]
            sec = chunk.get("section", "General")
            content = chunk["content"].strip()
            score = chunk.get("score", 0.5)
            scores.append(score)

            citation_label = f"[{title}, p. {page}]"

            context_blocks.append(
                f"--- EVIDENCE EXCERPT {idx + 1} ---\n"
                f"Source: {title}\n"
                f"Page: {page} | Section: {sec}\n"
                f"Reference Tag: {citation_label}\n"
                f"Content:\n{content}\n"
            )

            citations_lookup.append(CitationItem(
                document_id=doc_id,
                paper_title=title,
                page_number=page,
                chunk_id=cid,
                section=sec,
                quote=content[:250] + ("..." if len(content) > 250 else ""),
                citation_label=citation_label
            ))

        # Evidence score based on top retrieved chunk similarities
        avg_score = float(sum(scores) / max(len(scores), 1))
        evidence_score = round(min(1.0, max(0.1, avg_score)), 2)

        context_str = "\n".join(context_blocks)

        history_section = ""
        if conversation_history:
            history_blocks = []
            for msg in conversation_history[-4:]:  # last 4 turns
                role = "User" if msg["role"] == "user" else "Assistant"
                history_blocks.append(f"{role}: {msg['content']}")
            history_section = "CONVERSATION HISTORY (FOR CONTINUITY):\n" + "\n".join(history_blocks) + "\n\n"

        prompt = (
            f"{history_section}"
            f"RETRIEVED RESEARCH EVIDENCE:\n"
            f"{context_str}\n\n"
            f"CURRENT USER RESEARCH QUESTION:\n"
            f"{query}\n\n"
            f"Provide a rigorous, comprehensive, citation-grounded response citing each claim with [Paper Title, p. <page_number>]."
        )

        return prompt, citations_lookup, evidence_score

