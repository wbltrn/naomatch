from sqlalchemy import BigInteger, Column, DateTime, String, Text
from sqlalchemy.sql import func

from app.models.experience import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(BigInteger, primary_key=True, index=True)
    company = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    job_url = Column(Text, nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )