from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.experience import Experience, ExperienceBullet
from app.schemas.experience import ExperienceCreate, ExperienceResponse

router = APIRouter(
    prefix="/experiences",
    tags=["experiences"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ExperienceResponse)
def create_experience(
    experience_data: ExperienceCreate,
    db: Session = Depends(get_db),
):
    experience = Experience(
        type=experience_data.type,
        organization=experience_data.organization,
        title=experience_data.title,
        location=experience_data.location,
        start_date=experience_data.start_date,
        end_date=experience_data.end_date,
        description=experience_data.description,
    )

    db.add(experience)
    db.flush()

    for bullet in experience_data.bullets:
        experience_bullet = ExperienceBullet(
            experience_id=experience.id,
            bullet_text=bullet.bullet_text,
        )
        db.add(experience_bullet)

    db.commit()
    db.refresh(experience)

    return experience