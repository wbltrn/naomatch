from sqlalchemy import BigInteger, Column, Date, DateTime, String, Text
from sqlalchemy.sql import func

from app.database import Base


class Education(Base):
    __tablename__ = "education"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    school = Column(
        String(255),
        nullable=False,
    )

    degree = Column(
        String(255),
        nullable=True,
    )

    field_of_study = Column(
        String(255),
        nullable=True,
    )

    minor = Column(
        String(255),
        nullable=True,
    )

    location = Column(
        String(255),
        nullable=True,
    )

    start_date = Column(
        Date,
        nullable=True,
    )

    graduation_date = Column(
        Date,
        nullable=True,
    )

    gpa = Column(
        String(50),
        nullable=True,
    )

    coursework = Column(
        Text,
        nullable=True,
    )

    honors = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )