import os

class Settings:
    PROJECT_NAME: str = os.environ.get("PROJECT_NAME", "CVpolish API")
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg2://user:password@db:5432/CVpolish",
    )
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY" , "")
    
    CORS_ORIGINS_RAW: str = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    
    @property
    def ALLOWED_ORIGINS(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",")]

settings = Settings()
