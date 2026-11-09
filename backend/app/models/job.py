from sqlalchemy import Boolean, Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class Job(Base):
    __tablename__ = "jobs"


    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False, default="")
    language = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    file_name = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    analysis = Column(JSONB, nullable=False)
    cv = Column(JSONB, nullable=False)
    ai_used = Column(Boolean, nullable=False, default=False)