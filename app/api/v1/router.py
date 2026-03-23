from fastapi import APIRouter
from app.api.v1 import auth, users, ai, cvs, jds, analysis, chat, admin

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(cvs.router, tags=["cvs"])
api_router.include_router(jds.router, tags=["jds"])
api_router.include_router(analysis.router, tags=["analysis"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(admin.router, tags=["admin"])
