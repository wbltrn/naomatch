from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.experience import Experience
from app.models.job import JobPosting
from app.schemas.match import ExperienceMatchResponse
from app.services.matcher import calculate_experience_match

router = APIRouter(
    prefix="/matches",
    tags=["matches"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get(
    "/job/{job_id}",
    response_model=list[ExperienceMatchResponse],
)
def match_experiences_to_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id)
        .first()
    )

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job posting not found",
        )

    experiences = db.query(Experience).all()

    matches = [
        calculate_experience_match(experience, job)
        for experience in experiences
    ]

    return sorted(
        matches,
        key=lambda match: match["final_score"],
        reverse=True,
    )