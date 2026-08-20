import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.chat import (
    ChatRequest, ChatResponse, ConversationResponse, MessageResponse, CitationItem
)
from app.rag.rag_engine import RAGEngine
from app.api.deps import get_current_user_optional, rate_limiter

router = APIRouter()

@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(rate_limiter)])
async def chat_with_research_ai(
    payload: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    rag_engine = RAGEngine(db)
    response = await rag_engine.answer_question(
        query=payload.message,
        conversation_id=payload.conversation_id,
        collection_id=payload.collection_id,
        document_ids=payload.document_ids,
        top_k=payload.top_k,
        temperature=payload.temperature
    )
    
    # Associate conversation with user if authenticated
    if current_user and response.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == response.conversation_id).first()
        if conv and not conv.user_id:
            conv.user_id = current_user.id
            db.commit()

    return response

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Conversation)
    if current_user:
        query = query.filter((Conversation.user_id == current_user.id) | (Conversation.user_id == None))
    
    convs = query.order_by(desc(Conversation.created_at)).limit(50).all()
    results = []
    for c in convs:
        msg_items = []
        for m in c.messages:
            cits = []
            if m.citations_json:
                try:
                    cits_raw = json.loads(m.citations_json)
                    cits = [CitationItem(**ci) for ci in cits_raw]
                except Exception:
                    cits = []
            msg_items.append(MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                citations=cits,
                created_at=m.created_at
            ))
        results.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            messages=msg_items
        ))
    return results

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    if current_user and conv.user_id and conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this conversation.")

    msg_items = []
    for m in conv.messages:
        cits = []
        if m.citations_json:
            try:
                cits_raw = json.loads(m.citations_json)
                cits = [CitationItem(**ci) for ci in cits_raw]
            except Exception:
                cits = []
        msg_items.append(MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            citations=cits,
            created_at=m.created_at
        ))

    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        messages=msg_items
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    if current_user and conv.user_id and conv.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this conversation.")

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully"}
