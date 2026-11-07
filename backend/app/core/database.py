"""Database access for the whole app.

Create the SQLAlchemy engine and SessionLocal from DATABASE_URL (config.py),
and provide a `get_db` dependency for routers. One super-lightweight table
for now (per backend/API.md):

    profiles (lang PK, data JSONB, updated_at)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autoflush=False , autocommit=False , bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()    