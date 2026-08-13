from sqlalchemy import BigInteger, Column, ForeignKey, String
from sqlalchemy.orm import relationship

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    phone = Column(
        String(50),
        nullable=True,
    )

    email = Column(
        String(255),
        nullable=True,
    )

    links = relationship(
        "ProfileLink",
        back_populates="profile",
        cascade="all, delete-orphan",
    )


class ProfileLink(Base):
    __tablename__ = "profile_links"

    id = Column(
        BigInteger,
        primary_key=True,
        index=True,
    )

    profile_id = Column(
        BigInteger,
        ForeignKey(
            "user_profiles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    label = Column(
        String(255),
        nullable=False,
    )

    url = Column(
        String(500),
        nullable=False,
    )

    profile = relationship(
        "UserProfile",
        back_populates="links",
    )