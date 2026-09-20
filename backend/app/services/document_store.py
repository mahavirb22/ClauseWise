import uuid
from typing import Dict, Any, Optional, List
from app.models.clause import DocumentSummary, Clause


class DocumentStore:
    """
    In-memory storage service for ingested documents, raw text, and extracted clauses.
    """

    def __init__(self):
        self._documents: Dict[str, Dict[str, Any]] = {}

    def create_document(self, file_name: str, raw_text: str) -> str:
        doc_id = f"doc-{uuid.uuid4().hex[:8]}"
        self._documents[doc_id] = {
            "docId": doc_id,
            "fileName": file_name,
            "rawText": raw_text,
            "plainSummary": "",
            "clauses": [],
        }
        return doc_id

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        return self._documents.get(doc_id)

    def save_clauses(self, doc_id: str, plain_summary: str, clauses: List[Clause]) -> bool:
        if doc_id not in self._documents:
            return False
        
        self._documents[doc_id]["plainSummary"] = plain_summary
        self._documents[doc_id]["clauses"] = clauses
        return True

    def get_document_summary(self, doc_id: str) -> Optional[DocumentSummary]:
        doc = self._documents.get(doc_id)
        if not doc:
            return None
        return DocumentSummary(
            docId=doc["docId"],
            fileName=doc["fileName"],
            plainSummary=doc.get("plainSummary", ""),
            clauses=doc.get("clauses", []),
            rawText=doc.get("rawText", "")
        )

    def list_all_documents(self) -> List[Dict[str, Any]]:
        return list(self._documents.values())


# Global singleton instance
doc_store = DocumentStore()
