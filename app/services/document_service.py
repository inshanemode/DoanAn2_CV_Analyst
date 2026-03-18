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
        elif ext == ".txt":
            return self._extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _extract_from_pdf(self, file_path: str) -> str:
        text_parts: list[str] = []
        with fitz.open(file_path) as doc:
            for page in doc:
                page_text = page.get_text("text").strip()
                if page_text:
                    text_parts.append(page_text)
        text = "\n\n".join(text_parts).strip()
        if not text:
            raise ValueError("Không trích xuất được nội dung từ file PDF.")
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        document = Document(file_path)
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
        text = "\n\n".join(paragraphs).strip()
        if not text:
            raise ValueError("Không trích xuất được nội dung từ file DOCX.")
        return text

    def _extract_from_txt(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            text = file.read().strip()
        if not text:
            raise ValueError("File TXT không có nội dung.")
        return text

document_service = DocumentService()
