from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(BigInteger, primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    organization = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    location = Column(String(255), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    bullets = relationship(
        "ExperienceBullet",
        back_populates="experience",
        cascade="all, delete-orphan",
    )


class ExperienceBullet(Base):
    __tablename__ = "experience_bullets"

    id = Column(BigInteger, primary_key=True, index=True)

    experience_id = Column(
        BigInteger,
        ForeignKey("experiences.id", ondelete="CASCADE"),
        nullable=False,
    )

    bullet_text = Column(Text, nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    experience = relationship(
        "Experience",
        back_populates="bullets",
    )