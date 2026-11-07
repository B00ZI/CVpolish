from sqlalchemy import Column , String , DateTime , func 
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base
class Profile(Base):
    __tablename__ = "profiles"

    lang = Column(String , primary_key=True , index = True)
    data =  Column(JSONB , nullable=False)
    updated_at= Column(DateTime , default=func.now() , onupdate=func.now())