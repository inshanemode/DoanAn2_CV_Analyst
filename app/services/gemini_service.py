# import google.generativeai as genai
from app.core.config import settings

class GeminiService:
    def __init__(self):
        self.model = None
        # if settings.GOOGLE_API_KEY:
        #     genai.configure(api_key=settings.GOOGLE_API_KEY)
        #     self.model = genai.GenerativeModel('gemini-1.5-flash')
        # else:
        #     self.model = None
        #     print("Warning: GOOGLE_API_KEY not found in settings")

    async def generate_content(self, prompt: str) -> str:
        return "Gemini Service is temporarily disabled due to import error."

gemini_service = GeminiService()
