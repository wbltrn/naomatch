from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.experience import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(BigInteger, primary_key=True, index=True)

    job_id = Column(
        BigInteger,
        ForeignKey("job_postings.id", ondelete="CASCADE"),
        nullable=False,
    )

    status = Column(
        String(50),
        nullable=False,
        default="Interested",
    )

    applied_date = Column(Date, nullable=True)
    deadline = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )