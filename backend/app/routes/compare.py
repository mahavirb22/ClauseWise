from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.models.routes_models import (
    CompareRequest,
    CompareResponse,
    ClauseComparisonPair,
    MissingClauseItem,
    FavorsEnum,
)
from app.services.document_store import doc_store
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/api/compare", tags=["Compare"])
gemini_client = GeminiClient()


@router.post("", response_model=CompareResponse)
async def compare_documents(request: CompareRequest):
    """
    Compare two processed legal documents (docIdA vs docIdB).
    Pairs corresponding clauses by topic/category, evaluates which version favors the user (docA | docB | neutral),
    calculates risk delta, and lists unilateral (added/missing) clauses.
    """
    doc_a = doc_store.get_document(request.doc_id_a)
    if not doc_a:
        raise HTTPException(
            status_code=404,
            detail=f"Document A with docId '{request.doc_id_a}' not found in storage. Please ingest document first."
        )

    doc_b = doc_store.get_document(request.doc_id_b)
    if not doc_b:
        raise HTTPException(
            status_code=404,
            detail=f"Document B with docId '{request.doc_id_b}' not found in storage. Please ingest document first."
        )

    # Get extracted clauses for Doc A
    clauses_a_models = doc_a.get("clauses", [])
    if not clauses_a_models and doc_a.get("rawText"):
        analysis_a = await gemini_client.analyze_document_clauses(doc_a["rawText"])
        clauses_a = analysis_a.get("clauses", [])
    else:
        clauses_a = [c.model_dump(by_alias=True) if hasattr(c, "model_dump") else c for c in clauses_a_models]

    # Get extracted clauses for Doc B
    clauses_b_models = doc_b.get("clauses", [])
    if not clauses_b_models and doc_b.get("rawText"):
        analysis_b = await gemini_client.analyze_document_clauses(doc_b["rawText"])
        clauses_b = analysis_b.get("clauses", [])
    else:
        clauses_b = [c.model_dump(by_alias=True) if hasattr(c, "model_dump") else c for c in clauses_b_models]

    # Run Gemini Structured Comparison
    comparison_data = await gemini_client.compare_document_clause_sets(
        clauses_a=clauses_a,
        clauses_b=clauses_b,
        doc_id_a=request.doc_id_a,
        doc_id_b=request.doc_id_b
    )

    # Map output Pydantic DTOs
    paired_pairs: List[ClauseComparisonPair] = []
    for pair in comparison_data.get("paired_comparisons", comparison_data.get("pairedComparisons", [])):
        paired_pairs.append(
            ClauseComparisonPair(
                topic=pair.get("topic", "General"),
                docAText=pair.get("doc_a_text", pair.get("docAText", "")),
                docBText=pair.get("doc_b_text", pair.get("docBText", "")),
                differenceSummary=pair.get("difference_summary", pair.get("differenceSummary", "")),
                favors=FavorsEnum(pair.get("favors", "neutral")),
                riskDelta=pair.get("risk_delta", pair.get("riskDelta", ""))
            )
        )

    unilateral_items: List[MissingClauseItem] = []
    for item in comparison_data.get("unilateral_clauses", comparison_data.get("unilateralClauses", [])):
        unilateral_items.append(
            MissingClauseItem(
                presentIn=item.get("present_in", item.get("presentIn", "docA")),
                clauseId=item.get("clause_id", item.get("clauseId", "cls-unilateral")),
                topic=item.get("topic", "General"),
                text=item.get("text", ""),
                impact=item.get("impact", "")
            )
        )

    return CompareResponse(
        docIdA=request.doc_id_a,
        docIdB=request.doc_id_b,
        similarityScore=float(comparison_data.get("similarity_score", comparison_data.get("similarityScore", 0.70))),
        summary=comparison_data.get("summary", f"Comparison completed between {request.doc_id_a} and {request.doc_id_b}."),
        overallRecommendation=comparison_data.get("overall_recommendation", comparison_data.get("overallRecommendation", "Comparison review complete.")),
        pairedComparisons=paired_pairs,
        unilateralClauses=unilateral_items
    )
