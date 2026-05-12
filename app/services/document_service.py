import os

import fitz
from docx import Document

from app.services.gemini_service import gemini_service


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


class DocumentService:
    def is_supported_image(self, file_path: str) -> bool:
        return os.path.splitext(file_path)[1].lower() in IMAGE_EXTENSIONS

    def extract_text(self, file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self._extract_from_pdf(file_path)
        if ext == ".docx":
            return self._extract_from_docx(file_path)
        if ext == ".txt":
            return self._extract_from_txt(file_path)

        raise ValueError(f"Unsupported file format: {ext}")

    async def extract_text_async(self, file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if self.is_supported_image(file_path):
            text = await gemini_service.extract_text_from_image(file_path)
            if not text:
                raise ValueError("Khong doc duoc chu tu anh. Kiem tra GOOGLE_API_KEY hoac thu anh ro hon.")
            return text

        return self.extract_text(file_path)

    def _extract_from_pdf(self, file_path: str) -> str:
        text_parts: list[str] = []
        with fitz.open(file_path) as doc:
            for page in doc:
                page_text = page.get_text("text").strip()
                if page_text:
                    text_parts.append(page_text)
        text = "\n\n".join(text_parts).strip()
        if not text:
            raise ValueError("Khong trich xuat duoc noi dung tu file PDF.")
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        document = Document(file_path)
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text.strip()]
        text = "\n\n".join(paragraphs).strip()
        if not text:
            raise ValueError("Khong trich xuat duoc noi dung tu file DOCX.")
        return text

    def _extract_from_txt(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as file:
            text = file.read().strip()
        if not text:
            raise ValueError("File TXT khong co noi dung.")
        return text


document_service = DocumentService()
