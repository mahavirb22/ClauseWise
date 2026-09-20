from fastapi import APIRouter, Query, HTTPException, Path
from typing import Optional, List
from app.models.clause import Clause, RiskLevel, CategoryEnum
from app.models.routes_models import ClausesResponse
from app.services.gemini_client import GeminiClient
from app.services.document_store import doc_store

router = APIRouter(prefix="/api/clauses", tags=["Clauses"])
gemini_client = GeminiClient()


@router.post("/{doc_id}", response_model=ClausesResponse)
async def extract_and_analyze_clauses(doc_id: str = Path(..., description="Document ID to analyze")):
    """
    Extract structured legal clauses, plain-language rewrites, risk ratings, and intra-document conflicts using Gemini.
    Persists clauses to document record and returns them.
    """
    doc = doc_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with docId '{doc_id}' not found. Please run POST /api/ingest first.")

    raw_text = doc.get("rawText", "")
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail=f"Document '{doc_id}' has no text content to analyze.")

    # Call Gemini structured output analysis
    analysis_result = await gemini_client.analyze_document_clauses(raw_text)

    if not analysis_result.get("is_legal_document", True):
        return ClausesResponse(
            docId=doc_id,
            total=0,
            clauses=[],
            isLegalDocument=False,
            nonLegalWarning=analysis_result.get(
                "non_legal_warning",
                "This document does not appear to be a legal contract or agreement. Please upload a valid legal document."
            )
        )

    plain_summary = analysis_result.get("plain_summary", "")
    raw_clauses_data = analysis_result.get("clauses", [])

    parsed_clauses: List[Clause] = []
    for item in raw_clauses_data:
        try:
            # Map Pydantic model
            clause_obj = Clause(
                id=item.get("id", f"cls-{len(parsed_clauses)+1}"),
                text=item.get("text", ""),
                category=CategoryEnum(item.get("category", "other")),
                plainLanguage=item.get("plain_language", item.get("plainLanguage", "")),
                riskLevel=RiskLevel(item.get("risk_level", item.get("riskLevel", "low"))),
                riskReason=item.get("risk_reason", item.get("riskReason", "May warrant review because terms require inspection.")),
                conflictsWith=item.get("conflicts_with", item.get("conflictsWith", []))
            )
            parsed_clauses.append(clause_obj)
        except Exception as e:
            # Fallback for individual item parsing
            parsed_clauses.append(
                Clause(
                    id=item.get("id", f"cls-{len(parsed_clauses)+1}"),
                    text=str(item.get("text", "")),
                    category=CategoryEnum.OTHER,
                    plainLanguage=str(item.get("plain_language", "")),
                    riskLevel=RiskLevel.MEDIUM,
                    riskReason="May warrant review because clause parsing encountered formatting ambiguity.",
                    conflictsWith=[]
                )
            )

    # Persist clauses to doc_store
    doc_store.save_clauses(doc_id=doc_id, plain_summary=plain_summary, clauses=parsed_clauses)

    return ClausesResponse(
        docId=doc_id,
        total=len(parsed_clauses),
        clauses=parsed_clauses
    )


@router.get("", response_model=ClausesResponse)
async def list_clauses(
    doc_id: Optional[str] = Query(None, alias="docId"),
    risk_level: Optional[RiskLevel] = Query(None, alias="riskLevel"),
    category: Optional[CategoryEnum] = Query(None)
):
    """
    Retrieve stored clauses for a document with optional riskLevel and category filtering.
    """
    clauses: List[Clause] = []
    target_doc_id = doc_id or "default"

    if doc_id:
        doc = doc_store.get_document(doc_id)
        if doc and "clauses" in doc:
            clauses = doc["clauses"]
    else:
        # Search all documents for clauses
        for d in doc_store.list_all_documents():
            if "clauses" in d:
                clauses.extend(d["clauses"])

    if risk_level:
        clauses = [c for c in clauses if c.risk_level == risk_level]
    if category:
        clauses = [c for c in clauses if c.category == category]

    return ClausesResponse(
        docId=target_doc_id,
        total=len(clauses),
        clauses=clauses
    )


@router.get("/{clause_id}", response_model=Clause)
async def get_clause_by_id(clause_id: str):
    """
    Get detailed clause by ID from stored document records.
    """
    for doc in doc_store.list_all_documents():
        for clause in doc.get("clauses", []):
            if clause.id == clause_id:
                return clause

    raise HTTPException(status_code=404, detail=f"Clause with ID '{clause_id}' not found")
