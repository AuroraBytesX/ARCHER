import json
import re
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.rag.retriever import HybridRetriever
from app.rag.context_builder import ContextBuilder, RAG_SYSTEM_PROMPT
from app.rag.llm_provider import get_llm_provider
from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatResponse, CitationItem
from app.core.logging import logger

from app.rag.nlp_classifier import classify_query_intent

class RAGEngine:
    def __init__(self, db: Session):
        self.db = db
        self.retriever = HybridRetriever(db)
        self.llm_provider = get_llm_provider()

    async def answer_question(
        self,
        query: str,
        conversation_id: Optional[str] = None,
        collection_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        top_k: int = 10,
        temperature: float = 0.2
    ) -> ChatResponse:
        """
        Executes full grounded RAG pipeline:
        1. Query validation and intent detection
        2. Conversational context loading & query expansion
        3. Hybrid retrieval (vector + keyword)
        4. Context construction with citation tags
        5. LLM generation with strict citation grounding
        6. Evidence linking and conversation storage
        """
        trimmed_query = (query or "").strip()

        # 1. Conversational context loading
        conversation_history: List[Dict[str, str]] = []
        if conversation_id:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conv and conv.messages:
                for m in conv.messages[-6:]:
                    conversation_history.append({"role": m.role, "content": m.content})

        # 2. NLP Query Intent Classification with Conversation Awareness
        intent_type, intent_message = classify_query_intent(
            trimmed_query,
            has_conversation_history=bool(conversation_history)
        )
        if intent_type in ["GREETING", "POLITENESS", "CAPABILITY", "GIBBERISH", "OFF_TOPIC"]:
            conv_id, msg_id = self._save_conversation(conversation_id, trimmed_query, intent_message, [])
            return ChatResponse(
                conversation_id=conv_id,
                message_id=msg_id,
                answer=intent_message,
                citations=[],
                evidence_score=1.0,
                retrieved_chunks_count=0
            )

        # 3. Query Expansion & Sub-Question Resolution
        effective_retrieval_query = trimmed_query
        if conversation_history:
            last_user_msgs = [m["content"] for m in reversed(conversation_history) if m["role"] == "user"]
            if last_user_msgs:
                last_user_msg = last_user_msgs[0]
                # If query is short or a follow-up ("in short", "why", "summarize", "what about")
                if len(trimmed_query.split()) < 8 or any(p in trimmed_query.lower() for p in ["they", "it", "this method", "this paper", "the authors", "why", "in short", "summary", "briefly", "what about"]):
                    effective_retrieval_query = f"{last_user_msg} {trimmed_query}"

        # 4. Retrieve
        retrieved_chunks = self.retriever.retrieve(
            query=effective_retrieval_query,
            top_k=top_k,
            collection_id=collection_id,
            document_ids=document_ids,
            mode="hybrid"
        )

        # 4. Build context
        prompt, citations_list, evidence_score = ContextBuilder.build_context_and_prompt(
            query=trimmed_query,
            retrieved_chunks=retrieved_chunks,
            conversation_history=conversation_history
        )

        # If no evidence was found at all
        if not retrieved_chunks:
            answer = (
                "The retrieved documents do not contain sufficient evidence to answer this question. "
                "Please ensure the relevant papers are uploaded and ready in your library."
            )
            conv_id, msg_id = self._save_conversation(conversation_id, trimmed_query, answer, [])
            return ChatResponse(
                conversation_id=conv_id,
                message_id=msg_id,
                answer=answer,
                citations=[],
                evidence_score=0.0,
                retrieved_chunks_count=0
            )

        # 5. Call LLM with graceful fallback on runtime failure
        try:
            raw_answer = await self.llm_provider.generate_response(
                prompt=prompt,
                system_prompt=RAG_SYSTEM_PROMPT,
                temperature=temperature
            )
        except Exception as e:
            logger.warning(f"RAG LLM generation failed ({e}). Generating articulate grounded response from retrieved evidence.")
            bullet_points = []
            for c in retrieved_chunks[:4]:
                tag = f"[{c['paper_title']}, p. {c['page_number']}]"
                sec_label = f"({c.get('section', 'General')})" if c.get('section') else ""
                clean_txt = c['content'].strip().replace("\n", " ")
                bullet_points.append(f"- **{c['paper_title']}** {sec_label}: {clean_txt} {tag}")
            
            raw_answer = (
                f"Here are the relevant findings extracted directly from your research papers:\n\n"
                + "\n\n".join(bullet_points)
                + "\n\n*(Note: Start Ollama with `ollama run llama3:latest` for full conversational synthesis).* "
            )

        # 6. Filter citations that appear in answer or retain supporting citations
        cited_in_text = []
        for cit in citations_list:
            if cit.paper_title.lower() in raw_answer.lower() or f"p. {cit.page_number}" in raw_answer or f"p.{cit.page_number}" in raw_answer:
                cited_in_text.append(cit)

        active_citations = cited_in_text if cited_in_text else citations_list

        # Deduplicate citations by (document_id, page_number)
        seen_keys = set()
        deduped_citations: List[CitationItem] = []
        for cit in active_citations:
            key = (cit.document_id, cit.page_number)
            if key not in seen_keys:
                seen_keys.add(key)
                deduped_citations.append(cit)

        # 7. Persist to Conversation
        conv_id, msg_id = self._save_conversation(conversation_id, trimmed_query, raw_answer, deduped_citations)

        return ChatResponse(
            conversation_id=conv_id,
            message_id=msg_id,
            answer=raw_answer,
            citations=deduped_citations,
            evidence_score=evidence_score,
            retrieved_chunks_count=len(retrieved_chunks)
        )

    def _save_conversation(
        self,
        conversation_id: Optional[str],
        user_query: str,
        assistant_answer: str,
        citations: List[CitationItem]
    ) -> Tuple[str, str]:
        conv = None
        if conversation_id:
            conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()

        if not conv:
            title = (user_query[:45] + "...") if len(user_query) > 45 else user_query
            conv = Conversation(title=title)
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)

        user_msg = Message(
            conversation_id=conv.id,
            role="user",
            content=user_query
        )
        self.db.add(user_msg)

        citations_json = json.dumps([c.model_dump() for c in citations])
        asst_msg = Message(
            conversation_id=conv.id,
            role="assistant",
            content=assistant_answer,
            citations_json=citations_json
        )
        self.db.add(asst_msg)
        self.db.commit()
        self.db.refresh(asst_msg)

        return conv.id, asst_msg.id
