from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.profile import ProfileLink, UserProfile
from app.schemas.profile import UserProfile as UserProfileSchema


router = APIRouter(
    prefix="/profile",
    tags=["profile"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get(
    "",
    response_model=UserProfileSchema,
)
def get_profile(
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).first()

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="Profile not found",
        )

    return {
        "name": profile.name,
        "phone": profile.phone,
        "email": profile.email,
        "links": [
            {
                "label": link.label,
                "url": link.url,
            }
            for link in profile.links
        ],
    }


@router.put(
    "",
    response_model=UserProfileSchema,
)
def upsert_profile(
    profile_data: UserProfileSchema,
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).first()

    if profile is None:
        profile = UserProfile(
            name=profile_data.name,
            phone=profile_data.phone,
            email=profile_data.email,
        )

        db.add(profile)
        db.flush()

    else:
        profile.name = profile_data.name
        profile.phone = profile_data.phone
        profile.email = profile_data.email

        db.query(ProfileLink).filter(
            ProfileLink.profile_id == profile.id
        ).delete()

    for link in profile_data.links:
        db.add(
            ProfileLink(
                profile_id=profile.id,
                label=link.label,
                url=link.url,
            )
        )

    db.commit()
    db.refresh(profile)

    return {
        "name": profile.name,
        "phone": profile.phone,
        "email": profile.email,
        "links": [
            {
                "label": link.label,
                "url": link.url,
            }
            for link in profile.links
        ],
    }