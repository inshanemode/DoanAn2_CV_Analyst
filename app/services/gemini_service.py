from app.core.config import settings

try:
    from google import genai
except Exception:
    genai = None


class GeminiService:
    def __init__(self):
        self.client = None
        self.model_name = "gemini-2.5-flash"

        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if genai is not None and api_key:
            try:
                self.client = genai.Client(api_key=api_key)
                print("[GeminiService] ✅ Gemini AI initialized successfully.")
            except Exception as exc:
                self.client = None
                print(f"[GeminiService] Failed to initialize: {exc}")
        else:
            if not api_key:
                print("[GeminiService] GOOGLE_API_KEY not found, fallback to rule-based.")
            if genai is None:
                print("[GeminiService] google-genai package not available.")

    async def generate_content(self, prompt: str) -> str:
        if not self.client:
            return ""

        import asyncio

        def _call() -> str:
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                )
                return (response.text or "").strip()
            except Exception as exc:
                error_text = str(exc)
                upper_error = error_text.upper()
                if "429" in error_text or "RESOURCE_EXHAUSTED" in upper_error or "QUOTA" in upper_error:
                    print("[GeminiService] Quota exceeded (429/RESOURCE_EXHAUSTED), fallback to rule-based.")
                    return ""

                print(f"[GeminiService] API call failed, fallback to rule-based: {error_text}")
                return ""

        return await asyncio.to_thread(_call)


gemini_service = GeminiService()