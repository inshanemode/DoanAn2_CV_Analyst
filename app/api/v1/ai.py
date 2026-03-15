from fastapi import APIRouter, HTTPException
from app.services.gemini_service import gemini_service

router = APIRouter()

@router.post("/analyze")
async def analyze_text(prompt: str):
    """
    Test endpoint for Google Gemini AI.
    """
    result = await gemini_service.generate_content(prompt)
    if "Error" in result:
        raise HTTPException(status_code=500, detail=result)
    return {"result": result}
