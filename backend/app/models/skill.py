from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.sql import func

from app.database import Base


class Skill(Base):
    __tablename__ = "skills"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    category = Column(
        String(100),
        nullable=True,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )