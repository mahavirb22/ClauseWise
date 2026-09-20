from typing import Dict, Any


class PDFParser:
    """
    Service stub for extracting text and layout metadata from PDF files.
    """

    def extract_text_from_bytes(self, file_bytes: bytes, file_name: str) -> Dict[str, Any]:
        """
        Stub: Extract plain text and metadata from raw PDF bytes.
        """
        text_preview = file_bytes.decode("utf-8", errors="ignore") if file_bytes else ""
        return {
            "file_name": file_name,
            "page_count": 1,
            "text": text_preview or f"Extracted text content from {file_name}."
        }
