from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.router import api_router

# Import models so SQLAlchemy metadata registers them before create_all
import app.models  # noqa: F401


def create_app() -> FastAPI:
    application = FastAPI(
        title="CV Intelligence Platform API",
        description=(
            "## Nền tảng phân tích CV thông minh\n\n"
            "API Backend cho hệ thống phân tích và so khớp CV với mô tả công việc.\n\n"
            "### Tính năng chính\n"
            "- 🔐 **Xác thực** – Đăng ký, đăng nhập với JWT\n"
            "- 👤 **Quản lý người dùng** – Hồ sơ người dùng\n"
            "- 📄 **Quản lý CV** – Tải lên và trích xuất dữ liệu CV\n"
            "- 💼 **Mô tả công việc** – Quản lý JD và yêu cầu kỹ năng\n"
            "- 🤖 **Phân tích AI** – So khớp CV với JD\n"
        ),
        version="1.0.0",
        contact={
            "name": "CV Intelligence Team",
            "email": "contact@cvintelligence.vn",
        },
        license_info={"name": "MIT"},
        openapi_tags=[
            {"name": "Authentication", "description": "Đăng ký, đăng nhập, thông tin người dùng hiện tại"},
            {"name": "Users", "description": "Quản lý người dùng"},
        ],
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API router
    application.include_router(api_router, prefix="/api/v1")

    @application.on_event("startup")
    async def on_startup():
        """Try to create database tables on startup; warn if DB is not ready."""
        try:
            Base.metadata.create_all(bind=engine)
            print("✅ Database tables checked/created successfully.")
        except Exception as exc:
            print(
                f"⚠️  Could not connect to database on startup: {exc}\n"
                "   Update DATABASE_URL in .env and restart the server."
            )

    @application.get("/", tags=["Health"])
    async def health_check():
        return {
            "status": "ok",
            "app": "CV Intelligence Platform API",
            "version": "1.0.0",
            "docs": "/docs",
        }

    return application


app = create_app()
