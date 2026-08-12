from sqlalchemy import Column, Integer, String, Text

from app.database import Base


class ResumeTailorCache(Base):
    __tablename__ = "resume_tailor_cache"

    id = Column(Integer, primary_key=True, index=True)

    cache_key = Column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    tailored_resume = Column(
        Text,
        nullable=False,
    )