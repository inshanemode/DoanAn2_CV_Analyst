import os
import fitz  # PyMuPDF
from docx import Document

class DocumentService:
    def extract_text(self, file_path: str) -> str:
        """
        Trích xuất nội dung văn bản từ file PDF hoặc DOCX.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self._extract_from_pdf(file_path)
        elif ext == ".docx":
            return self._extract_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _extract_from_pdf(self, file_path: str) -> str:
        text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

document_service = DocumentService()
