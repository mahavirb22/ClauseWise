import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from app.services.gemini_client import GeminiClient
from app.services.document_store import doc_store
from app.models.routes_models import IngestResponse
from app.models.clause import DocumentSummary

router = APIRouter(prefix="/api/ingest", tags=["Ingest"])
gemini_client = GeminiClient()

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"}


@router.post("", response_model=IngestResponse)
async def ingest_document(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None)
):
    """
    Ingest a legal document (PDF, image, or plain text) via multipart upload.
    Validates file size (max 15MB), file type, and checks for corrupted or empty uploads.
    Sends raw file directly to Gemini native multimodal API to extract document text.
    """
    if not file and not raw_text:
        raise HTTPException(
            status_code=400,
            detail="Either a file upload (PDF/Image/Text) or raw_text must be provided."
        )

    file_name = file.filename if file else "Uploaded_Document.txt"
    extracted_text = ""

    if file:
        # File Extension Validation
        ext = os.path.splitext(file_name)[1].lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, WEBP, TXT, MD."
            )

        try:
            file_bytes = await file.read()
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read uploaded file '{file_name}'. The file may be corrupted or unreadable."
            )

        # File Size Validation (15 MB Max)
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File size ({len(file_bytes) / (1024*1024):.1f}MB) exceeds maximum limit of 15MB."
            )

        # Empty File Validation
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded file '{file_name}' is empty (0 bytes)."
            )

        mime_type = file.content_type or "application/pdf"
        try:
            extracted_text = await gemini_client.extract_text_from_file_bytes(
                file_bytes=file_bytes,
                mime_type=mime_type,
                file_name=file_name
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract document contents from '{file_name}': {str(e)}"
            )
    elif raw_text:
        extracted_text = raw_text.strip()

    if not extracted_text or not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail=f"No readable text could be extracted from '{file_name}'. The document may be corrupted or unreadable."
        )

    # Persist document to document_store
    doc_id = doc_store.create_document(file_name=file_name, raw_text=extracted_text)

    # Return initial summary record
    doc_summary = DocumentSummary(
        docId=doc_id,
        fileName=file_name,
        plainSummary="Document ingested. Call POST /api/clauses/{docId} to extract clauses.",
        clauses=[],
        rawText=extracted_text[:300] + ("..." if len(extracted_text) > 300 else "")
    )

    return IngestResponse(
        document=doc_summary,
        message=f"Document '{file_name}' successfully ingested with docId: {doc_id}",
        status="success"
    )
