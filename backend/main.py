from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# Importing all model files here registers their tables BEFORE create_all.
from app import models  # noqa: F401
from app.routers import profile , job




app = FastAPI(title=settings.PROJECT_NAME)
Base.metadata.create_all(bind=engine)

app.include_router(profile.router , prefix="/api/profile")
app.include_router(job.router , prefix="/api/jobs")

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

