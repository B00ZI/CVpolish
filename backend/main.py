from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# Importing all model files here registers their tables BEFORE create_all.
from app import models  # noqa: F401
from app.routers.profile import router




app = FastAPI(title=settings.PROJECT_NAME)
Base.metadata.create_all(bind=engine)

app.include_router(router , prefix="/api/profile")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
