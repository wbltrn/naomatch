from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.application import Application
from app.schemas.application import ApplicationCreate, ApplicationResponse

router = APIRouter(
    prefix="/applications",
    tags=["applications"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=ApplicationResponse)
def create_application(
    application_data: ApplicationCreate,
    db: Session = Depends(get_db),
):
    application = Application(
        job_id=application_data.job_id,
        status=application_data.status,
        applied_date=application_data.applied_date,
        deadline=application_data.deadline,
        notes=application_data.notes,
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.get("/", response_model=list[ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
):
    return db.query(Application).all()


@router.get("/{application_id}", response_model=ApplicationResponse)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
):
    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    return application