import google.generativeai as genai
from app.core.config import settings

class GeminiService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("Warning: GOOGLE_API_KEY not found in settings")

    async def generate_content(self, prompt: str) -> str:
        if not self.model:
            return "Gemini Service is not configured. Please check your GOOGLE_API_KEY."
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating content: {str(e)}"

gemini_service = GeminiService()
