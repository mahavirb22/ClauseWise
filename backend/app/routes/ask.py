from fastapi import APIRouter
from typing import List, Dict
from app.models.routes_models import AskRequest, AskResponse, Citation
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/api/ask", tags=["Ask Q&A"])
gemini_client = GeminiClient()


@router.post("", response_model=AskResponse)
async def ask_legal_question(request: AskRequest):
    """
    Legal Document Q&A assistant endpoint. Answers natural language queries grounded in document clauses
    and Indian legal statutes, supports multi-turn chat history, strictly refuses out-of-scope queries,
    and appends a naturally-varied legal disclaimer framing line.
    """
    # Convert chat history models to dict list
    history_dicts: List[Dict[str, str]] = []
    if request.chat_history:
        for msg in request.chat_history:
            history_dicts.append({
                "role": msg.role,
                "content": msg.content
            })

    qa_result = await gemini_client.answer_legal_question(
        question=request.question,
        doc_id=request.doc_id,
        chat_history=history_dicts
    )

    # Format citations DTOs
    citations_list: List[Citation] = []
    for cite in qa_result.get("citations", []):
        citations_list.append(
            Citation(
                clauseId=cite.get("clause_id", cite.get("clauseId", "cls-1")),
                category=cite.get("category", "General"),
                snippet=cite.get("snippet", ""),
                relevanceScore=float(cite.get("relevance_score", cite.get("relevanceScore", 0.90)))
            )
        )

    return AskResponse(
        question=request.question,
        answer=qa_result.get("answer", "This document does not address that topic."),
        citations=citations_list,
        confidence=float(qa_result.get("confidence", 0.95)),
        disclaimerFraming=qa_result.get(
            "disclaimer_framing",
            qa_result.get(
                "disclaimerFraming",
                "This analysis is provided for informational evaluation and does not constitute formal legal counsel."
            )
        )
    )
