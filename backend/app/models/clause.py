from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            val_lower = value.lower()
            for item in cls:
                if item.value == val_lower:
                    return item
        return super()._missing_(value)


class CategoryEnum(str, Enum):
    PAYMENT = "payment"
    TERMINATION = "termination"
    LIABILITY = "liability"
    INDEMNITY = "indemnity"
    AUTO_RENEWAL = "auto_renewal"
    ARBITRATION = "arbitration"
    CONFIDENTIALITY = "confidentiality"
    OTHER = "other"

    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            val_lower = value.lower().replace("-", "_").replace(" ", "_")
            for item in cls:
                if item.value == val_lower:
                    return item
        return cls.OTHER


class Clause(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "id": "cls-1",
                "text": "The Licensee shall indemnify, defend, and hold harmless the Licensor from any third-party claims.",
                "category": "indemnity",
                "plainLanguage": "The licensee is responsible for paying all legal costs if a third party sues the licensor.",
                "riskLevel": "high",
                "riskReason": "May warrant review because uncapped indemnity exposes the licensee to unlimited financial liability.",
                "conflictsWith": ["cls-4"]
            }
        }
    )

    id: str = Field(..., description="Unique clause identifier")
    text: str = Field(..., description="Verbatim text of the legal clause")
    category: CategoryEnum = Field(default=CategoryEnum.OTHER, description="Categorized legal topic")
    plain_language: str = Field(..., alias="plainLanguage", description="1-2 sentence rewrite in simple English")
    risk_level: RiskLevel = Field(..., alias="riskLevel", description="Assessed risk rating: low, medium, high")
    risk_reason: str = Field(..., alias="riskReason", description="1 sentence explaining risk, phrased as 'may warrant review because...'")
    conflicts_with: List[str] = Field(default_factory=list, alias="conflictsWith", description="IDs of contradictory clauses")


class DocumentSummary(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    doc_id: str = Field(..., alias="docId", description="Unique document ID")
    file_name: str = Field(..., alias="fileName", description="Original uploaded file name")
    plain_summary: str = Field(default="", alias="plainSummary", description="Executive plain-language document summary")
    clauses: List[Clause] = Field(default_factory=list, description="Extracted legal clauses")
    raw_text: Optional[str] = Field(default=None, alias="rawText", description="Full extracted raw text of document")
