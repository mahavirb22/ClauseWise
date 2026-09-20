from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models.clause import Clause, DocumentSummary, RiskLevel, CategoryEnum


def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class BaseCamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )


class FavorsEnum(str, Enum):
    DOC_A = "docA"
    DOC_B = "docB"
    NEUTRAL = "neutral"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            val_lower = value.lower().replace("-", "_").replace(" ", "_")
            if "doca" in val_lower or "a" in val_lower:
                return cls.DOC_A
            elif "docb" in val_lower or "b" in val_lower:
                return cls.DOC_B
        return cls.NEUTRAL


# --- Ingest Models ---
class IngestResponse(BaseCamelModel):
    document: DocumentSummary
    message: str = Field("Document ingested successfully", description="Status message")
    status: str = Field("success", description="Response status")


# --- Clauses Models ---
class ClausesFilterRequest(BaseCamelModel):
    risk_level: Optional[RiskLevel] = Field(None, alias="riskLevel")
    category: Optional[CategoryEnum] = Field(None)
    search_query: Optional[str] = Field(None, alias="searchQuery")


class ClausesResponse(BaseCamelModel):
    doc_id: str = Field(..., alias="docId")
    total: int
    clauses: List[Clause]
    is_legal_document: bool = Field(default=True, alias="isLegalDocument", description="False if uploaded file is non-legal text like recipes or code")
    non_legal_warning: Optional[str] = Field(default=None, alias="nonLegalWarning", description="Warning text if document is non-legal")


# --- Compare Models ---
class CompareRequest(BaseCamelModel):
    doc_id_a: str = Field(..., alias="docIdA", description="First document ID (e.g. Base/V1)")
    doc_id_b: str = Field(..., alias="docIdB", description="Second document ID (e.g. Revised/V2)")
    focus_categories: Optional[List[str]] = Field(None, alias="focusCategories")


class ClauseComparisonPair(BaseCamelModel):
    topic: str = Field(..., description="Topic or category of the clause comparison")
    doc_a_text: str = Field(..., alias="docAText", description="Verbatim clause text from Document A")
    doc_b_text: str = Field(..., alias="docBText", description="Verbatim clause text from Document B")
    difference_summary: str = Field(..., alias="differenceSummary", description="Plain English description of what changed")
    favors: FavorsEnum = Field(..., description="Which version favors the user: docA | docB | neutral")
    risk_delta: str = Field(..., alias="riskDelta", description="Explains if risk increased/decreased and why")


class MissingClauseItem(BaseCamelModel):
    present_in: str = Field(..., alias="presentIn", description="Which document contains this clause: docA | docB")
    clause_id: str = Field(..., alias="clauseId", description="Clause ID")
    topic: str = Field(..., description="Topic or category of the missing/unilateral clause")
    text: str = Field(..., description="Verbatim text of the clause")
    impact: str = Field(..., description="Legal impact of this clause being present in only one version")


class CompareResponse(BaseCamelModel):
    doc_id_a: str = Field(..., alias="docIdA")
    doc_id_b: str = Field(..., alias="docIdB")
    similarity_score: float = Field(..., alias="similarityScore")
    summary: str = Field(..., description="Executive summary of differences between the two contract versions")
    overall_recommendation: str = Field(..., alias="overallRecommendation", description="Clear advice on which version benefits the user less/more")
    paired_comparisons: List[ClauseComparisonPair] = Field(default_factory=list, alias="pairedComparisons")
    unilateral_clauses: List[MissingClauseItem] = Field(default_factory=list, alias="unilateralClauses")


# Legacy ClauseConflict for backward compatibility
class ClauseConflict(BaseCamelModel):
    clause_id_a: str = Field(..., alias="clauseIdA")
    clause_id_b: str = Field(..., alias="clauseIdB")
    conflict_type: str = Field(..., alias="conflictType")
    explanation: str
    severity: RiskLevel


# --- Ask Q&A Models ---
class ChatMessage(BaseCamelModel):
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class AskRequest(BaseCamelModel):
    question: str = Field(..., description="User query about the legal document")
    doc_id: Optional[str] = Field(None, alias="docId", description="Target document ID")
    chat_history: Optional[List[ChatMessage]] = Field(default_factory=list, alias="chatHistory", description="Past conversation turns for context")


class Citation(BaseCamelModel):
    clause_id: str = Field(..., alias="clauseId", description="Clause ID or Section citation")
    category: str = Field(..., description="Category or Statute title")
    snippet: str = Field(..., description="Verbatim quote snippet")
    relevance_score: float = Field(..., alias="relevanceScore", description="Relevance score between 0.0 and 1.0")


class AskResponse(BaseCamelModel):
    question: str
    answer: str
    citations: List[Citation] = Field(default_factory=list)
    confidence: float = Field(default=0.95)
    disclaimer_framing: str = Field(
        default="This analysis is for informational evaluation and does not constitute formal legal counsel.",
        alias="disclaimerFraming",
        description="Naturally varied contextual disclaimer framing line"
    )


# --- Next Steps & Consultation Brief Models ---
class NextStepsRequest(BaseCamelModel):
    doc_id: str = Field(..., alias="docId")


class ClauseActionPlan(BaseCamelModel):
    clause_id: str = Field(..., alias="clauseId", description="ID of the MEDIUM/HIGH risk clause")
    category: str = Field(..., description="Legal category")
    risk_level: RiskLevel = Field(..., alias="riskLevel", description="Risk level: medium or high")
    verbatim_snippet: str = Field(..., alias="verbatimSnippet", description="Verbatim snippet of the clause")
    action_checklist: List[str] = Field(
        ...,
        alias="actionChecklist",
        description="2-4 short, concrete, non-legal-advice personal actions the user can take"
    )
    lawyer_questions: List[str] = Field(
        ...,
        alias="lawyerQuestions",
        description="1-3 specific questions the user can read aloud in a legal consultation referencing the clause directly"
    )


# Legacy ActionItem for backward compatibility
class ActionItem(BaseCamelModel):
    id: str
    priority: RiskLevel
    title: str
    recommendation: str
    clause_id: Optional[str] = Field(None, alias="clauseId")


class NextStepsResponse(BaseCamelModel):
    doc_id: str = Field(..., alias="docId")
    file_name: str = Field(default="Document", alias="fileName")
    document_brief: List[str] = Field(
        default_factory=list,
        alias="documentBrief",
        description="3-5 bullet point executive summary meant to be printed/exported prior to a legal consultation"
    )
    executive_recommendation: str = Field(..., alias="executiveRecommendation")
    clause_action_plans: List[ClauseActionPlan] = Field(default_factory=list, alias="clauseActionPlans")
    action_items: List[ActionItem] = Field(default_factory=list, alias="actionItems")
