from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.experience import Experience
from app.models.job import JobPosting
from app.schemas.resume import TailoredResumeContent
from app.services.resume_tailor import (
    ResumeTailoringUnavailableError,
    tailor_resume_content,
)


router = APIRouter(
    prefix="/resume-tailor",
    tags=["resume-tailor"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post(
    "/job/{job_id}",
    response_model=TailoredResumeContent,
)
def tailor_resume_for_job(
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

    experience_payload = [
        {
            "id": experience.id,
            "title": experience.title,
            "organization": experience.organization,
            "description": experience.description,
            "bullets": [
                bullet.bullet_text
                for bullet in experience.bullets
            ],
        }
        for experience in experiences
    ]

    try:
        return tailor_resume_content(
            job_title=job.title,
            job_description=job.description,
            experiences=experience_payload,
        )

    except ResumeTailoringUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error