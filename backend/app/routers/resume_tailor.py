from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.experience import Experience
from app.models.job import JobPosting
from app.schemas.resume import TailoredResumeDocument
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
    response_model=TailoredResumeDocument,
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

    vault_sections_map: dict[str, list[dict]] = {}

    for experience in experiences:
        section_type = experience.type

        entry = {
            "id": experience.id,
            "title": experience.title,
            "organization": experience.organization,
            "location": experience.location,
            "start_date": (
                experience.start_date.isoformat()
                if experience.start_date
                else None
            ),
            "end_date": (
                experience.end_date.isoformat()
                if experience.end_date
                else None
            ),
            "description": experience.description,
            "bullets": [
                bullet.bullet_text
                for bullet in experience.bullets
            ],
        }

        vault_sections_map.setdefault(
            section_type,
            [],
        ).append(entry)

    vault_sections = [
        {
            "section_type": section_type,
            "items": items,
        }
        for section_type, items in vault_sections_map.items()
    ]

    try:
        return tailor_resume_content(
            db=db,
            job_title=job.title,
            job_description=job.description,
            vault_sections=vault_sections,
        )

    except ResumeTailoringUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error