from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.job import JobPosting
from app.schemas.job import JobPostingCreate, JobPostingResponse

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=JobPostingResponse)
def create_job(
    job_data: JobPostingCreate,
    db: Session = Depends(get_db),
):
    job = JobPosting(
        company=job_data.company,
        title=job_data.title,
        location=job_data.location,
        job_url=job_data.job_url,
        description=job_data.description,
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    return job


@router.get("/", response_model=list[JobPostingResponse])
def get_jobs(
    db: Session = Depends(get_db),
):
    return db.query(JobPosting).all()


@router.get("/{job_id}", response_model=JobPostingResponse)
def get_job(
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

    return job