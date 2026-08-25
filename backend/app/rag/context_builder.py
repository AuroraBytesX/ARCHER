from typing import List, Dict, Any, Tuple, Optional
import re
from app.schemas.chat import CitationItem

RAG_SYSTEM_PROMPT = """You are ARCHER, an intelligent, conversational, and precise AI research assistant (like ChatGPT, but strictly grounded on the user's uploaded papers).

GOAL:
Answer the user's inquiry in a fluent, natural, and helpful manner using the provided research paper excerpts.

CORE INSTRUCTIONS:
1. Natural & Fluent Synthesis: Do not just paste raw quotes. Synthesize clear, well-explained answers with concise bullet points, explaining complex scientific concepts in plain English.
2. Grounded Page Citations: Every time you reference a key finding, formula, dataset, or methodology, cite the paper and page number in brackets: [Paper Title, p. <page_number>].
3. Follow-Ups & Brevity: If the user asks for "in short", "summarize", or asks a follow-up question, adapt immediately and provide a crisp, direct answer in 2-4 sentences or tight bullet points.
4. Conversational Politeness: If the user says "hello", "thanks", or asks general questions about your purpose, reply conversationally and guide them on what they can ask about their uploaded papers.
5. Missing Evidence: If the documents do not cover the specific question, clearly explain what the documents discuss and what information is missing.
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
        # Use top 4 most relevant chunks to maintain fast token budget
        for idx, chunk in enumerate(retrieved_chunks[:4]):
            doc_id = chunk["document_id"]
            title = chunk["paper_title"]
            page = chunk["page_number"]
            cid = chunk["chunk_id"]
            sec = chunk.get("section", "General")
            content = chunk["content"].strip()
            # Trim content to 450 chars max
            content_trimmed = content[:450] + ("..." if len(content) > 450 else "")
            score = chunk.get("score", 0.5)
            scores.append(score)

            citation_label = f"[{title}, p. {page}]"

            context_blocks.append(
                f"--- EVIDENCE EXCERPT {idx + 1} ---\n"
                f"Source: {title}\n"
                f"Page: {page} | Section: {sec}\n"
                f"Reference Tag: {citation_label}\n"
                f"Content:\n{content_trimmed}\n"
            )

            citations_lookup.append(CitationItem(
                document_id=doc_id,
                paper_title=title,
                page_number=page,
                chunk_id=cid,
                section=sec,
                quote=content[:200] + ("..." if len(content) > 200 else ""),
                citation_label=citation_label
            ))

        # Evidence score based on top retrieved chunk similarities
        avg_score = float(sum(scores) / max(len(scores), 1))
        evidence_score = round(min(1.0, max(0.1, avg_score)), 2)

        context_str = "\n".join(context_blocks)

        history_section = ""
        if conversation_history:
            history_blocks = []
            for msg in conversation_history[-2:]:  # last 2 turns
                role = "User" if msg["role"] == "user" else "Assistant"
                content_short = msg['content'][:250] + ("..." if len(msg['content']) > 250 else "")
                history_blocks.append(f"{role}: {content_short}")
            history_section = "CONVERSATION HISTORY (FOR CONTINUITY):\n" + "\n".join(history_blocks) + "\n\n"

        prompt = (
            f"{history_section}"
            f"RETRIEVED RESEARCH EVIDENCE:\n"
            f"{context_str}\n\n"
            f"CURRENT USER RESEARCH QUESTION:\n"
            f"{query}\n\n"
            f"Provide a natural, clear, citation-grounded answer. Cite each key claim using [Paper Title, p. <page_number>]."
        )

        return prompt, citations_lookup, evidence_score

