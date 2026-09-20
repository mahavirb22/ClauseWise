from fastapi import APIRouter, Path, HTTPException
from typing import List, Optional
from app.models.clause import RiskLevel
from app.models.routes_models import (
    NextStepsRequest,
    NextStepsResponse,
    ClauseActionPlan,
    ActionItem,
)
from app.services.document_store import doc_store
from app.services.gemini_client import GeminiClient

router = APIRouter(prefix="/api/nextsteps", tags=["Next Steps"])
gemini_client = GeminiClient()


@router.post("/{doc_id}", response_model=NextStepsResponse)
async def generate_next_steps_for_document(doc_id: str = Path(..., description="Target Document ID")):
    """
    Analyzes all MEDIUM and HIGH risk clauses in a document to generate structured action checklists,
    literal legal consultation questions, and a 3-5 bullet point exportable document consultation brief.
    """
    doc = doc_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document with docId '{doc_id}' not found. Please ingest document first.")

    raw_result = await gemini_client.generate_next_steps_for_doc(doc_id)

    file_name = doc.get("fileName", doc_id)
    document_brief = raw_result.get("document_brief", raw_result.get("documentBrief", []))
    exec_rec = raw_result.get("executive_recommendation", raw_result.get("executiveRecommendation", "Consultation Brief complete."))
    raw_plans = raw_result.get("clause_action_plans", raw_result.get("clauseActionPlans", []))

    clause_action_plans: List[ClauseActionPlan] = []
    legacy_action_items: List[ActionItem] = []

    for idx, plan in enumerate(raw_plans):
        cid = plan.get("clause_id", plan.get("clauseId", f"cls-{idx+1}"))
        cat = plan.get("category", "General")
        risk_str = str(plan.get("risk_level", plan.get("riskLevel", "high"))).lower()
        risk = RiskLevel.HIGH if "high" in risk_str else RiskLevel.MEDIUM
        snippet = plan.get("verbatim_snippet", plan.get("verbatimSnippet", ""))
        checklist = plan.get("action_checklist", plan.get("actionChecklist", []))
        questions = plan.get("lawyer_questions", plan.get("lawyerQuestions", []))

        clause_action_plans.append(
            ClauseActionPlan(
                clauseId=cid,
                category=cat,
                riskLevel=risk,
                verbatimSnippet=snippet,
                actionChecklist=checklist,
                lawyerQuestions=questions
            )
        )

        # Map legacy ActionItem for backward compatibility
        if checklist:
            legacy_action_items.append(
                ActionItem(
                    id=f"act-{idx+1:02d}",
                    priority=risk,
                    title=f"Review {cat} ({cid})",
                    recommendation=checklist[0],
                    clauseId=cid
                )
            )

    return NextStepsResponse(
        docId=doc_id,
        fileName=file_name,
        documentBrief=document_brief,
        executiveRecommendation=exec_rec,
        clauseActionPlans=clause_action_plans,
        actionItems=legacy_action_items
    )


@router.post("", response_model=NextStepsResponse)
async def generate_next_steps_post_body(request: NextStepsRequest):
    """
    POST body handler wrapper for POST /api/nextsteps.
    """
    return await generate_next_steps_for_document(request.doc_id)
