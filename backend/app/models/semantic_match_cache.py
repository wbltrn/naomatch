from sqlalchemy import Column, Float, Integer, String, Text

from app.database import Base


class SemanticMatchCache(Base):
    __tablename__ = "semantic_match_cache"

    id = Column(Integer, primary_key=True, index=True)

    cache_key = Column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )

    semantic_score = Column(
        Float,
        nullable=False,
    )

    responsibility_score = Column(
        Float,
        nullable=False,
    )

    technical_score = Column(
        Float,
        nullable=False,
    )

    domain_score = Column(
        Float,
        nullable=False,
    )

    evidence_score = Column(
        Float,
        nullable=False,
    )

    matched_responsibilities = Column(
        Text,
        nullable=False,
    )

    strengths = Column(
        Text,
        nullable=False,
    )

    gaps = Column(
        Text,
        nullable=False,
    )