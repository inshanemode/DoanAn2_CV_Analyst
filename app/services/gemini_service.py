from app.core.config import settings

try:
    import google.generativeai as genai  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    genai = None  # type: ignore


class GeminiService:
    def __init__(self):
        self.model = None

        api_key = getattr(settings, "GOOGLE_API_KEY", None)
        if genai is not None and api_key:
            try:
                genai.configure(api_key=api_key)
                # dùng bản flash cho tốc độ, đủ cho scoring
                self.model = genai.GenerativeModel("gemini-1.5-flash")
            except Exception as exc:  # pragma: no cover - defensively log & degrade
                self.model = None
                print(f"[GeminiService] Failed to initialize model: {exc}")
        else:
            if not api_key:
                print("[GeminiService] GOOGLE_API_KEY not found in settings, AI analysis will fallback.")
            if genai is None:
                print("[GeminiService] google-generativeai package not available, AI analysis will fallback.")

    async def generate_content(self, prompt: str) -> str:
        """Generate content using Gemini if available, otherwise return empty string.

        Trả về chuỗi rỗng khi không dùng được AI để MatchingService
        có thể fallback sang rule-based một cách an toàn.
        """
        if not self.model:
            return ""

        # google-generativeai là sync API, bọc trong thread để không block event loop
        import asyncio

        def _call_model() -> str:
            response = self.model.generate_content(prompt)
            # API có thể trả về nhiều định dạng, ưu tiên .text
            return getattr(response, "text", str(response))

        return await asyncio.to_thread(_call_model)


gemini_service = GeminiService()
