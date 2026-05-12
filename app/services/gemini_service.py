import asyncio
import mimetypes

from app.core.config import settings

try:
    from google import genai as google_genai
    from google.genai import types as genai_types
except Exception:
    google_genai = None
    genai_types = None

try:
    import google.generativeai as legacy_genai
except Exception:
    legacy_genai = None


class GeminiService:
    def __init__(self):
        self.client = None
        self.legacy_model = None
        self.model_name = "gemini-2.5-flash"

        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if google_genai is not None and api_key:
            try:
                self.client = google_genai.Client(api_key=api_key)
                print("[GeminiService] Gemini AI initialized successfully.")
            except Exception as exc:
                self.client = None
                print(f"[GeminiService] Failed to initialize: {exc}")
        elif legacy_genai is not None and api_key:
            try:
                legacy_genai.configure(api_key=api_key)
                self.legacy_model = legacy_genai.GenerativeModel(self.model_name)
                print("[GeminiService] Gemini AI initialized successfully.")
            except Exception as exc:
                self.legacy_model = None
                print(f"[GeminiService] Failed to initialize legacy SDK: {exc}")
        else:
            if not api_key:
                print("[GeminiService] GOOGLE_API_KEY not found, fallback to rule-based.")
            if google_genai is None and legacy_genai is None:
                print("[GeminiService] Gemini package not available.")

    @property
    def is_available(self) -> bool:
        return self.client is not None or self.legacy_model is not None

    async def generate_content(self, prompt: str) -> str:
        if not self.is_available:
            return ""

        def _call() -> str:
            try:
                if self.client is not None:
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=prompt,
                    )
                else:
                    response = self.legacy_model.generate_content(prompt)
                return (response.text or "").strip()
            except Exception as exc:
                self._log_api_error(exc)
                return ""

        return await asyncio.to_thread(_call)

    async def extract_text_from_image(self, file_path: str, prompt: str | None = None) -> str:
        if not self.is_available:
            return ""

        mime_type = mimetypes.guess_type(file_path)[0] or "image/jpeg"
        ocr_prompt = prompt or (
            "Doc toan bo chu trong anh nay va tra ve nguyen van noi dung. "
            "Giu xuong dong hop ly. Khong giai thich them."
        )

        def _call() -> str:
            try:
                with open(file_path, "rb") as image_file:
                    image_bytes = image_file.read()

                if self.client is not None:
                    image_part = genai_types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type,
                    )
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=[ocr_prompt, image_part],
                    )
                else:
                    image_part = {"mime_type": mime_type, "data": image_bytes}
                    response = self.legacy_model.generate_content([ocr_prompt, image_part])

                return (response.text or "").strip()
            except Exception as exc:
                self._log_api_error(exc)
                return ""

        return await asyncio.to_thread(_call)

    def _log_api_error(self, exc: Exception) -> None:
        error_text = str(exc)
        upper_error = error_text.upper()
        if "429" in error_text or "RESOURCE_EXHAUSTED" in upper_error or "QUOTA" in upper_error:
            print("[GeminiService] Quota exceeded (429/RESOURCE_EXHAUSTED), fallback to rule-based.")
            return

        print(f"[GeminiService] API call failed, fallback to rule-based: {error_text}")


gemini_service = GeminiService()
