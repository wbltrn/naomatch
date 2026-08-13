from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.education import Education

from app.schemas.education import (
    EducationCreate,
    EducationResponse,
    EducationUpdate,
)


router = APIRouter(
    prefix="/education",
    tags=["education"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post(
    "",
    response_model=EducationResponse,
)
def create_education(
    education_data: EducationCreate,
    db: Session = Depends(get_db),
):
    education = Education(
        **education_data.model_dump()
    )

    db.add(education)
    db.commit()
    db.refresh(education)

    return education


@router.get(
    "",
    response_model=list[EducationResponse],
)
def get_education(
    db: Session = Depends(get_db),
):
    return (
        db.query(Education)
        .order_by(Education.id.asc())
        .all()
    )

@router.put(
    "/{education_id}",
    response_model=EducationResponse,
)
def update_education(
    education_id: int,
    education_data: EducationUpdate,
    db: Session = Depends(get_db),
):
    education = (
        db.query(Education)
        .filter(Education.id == education_id)
        .first()
    )

    if education is None:
        raise HTTPException(
            status_code=404,
            detail="Education entry not found",
        )

    for field, value in education_data.model_dump().items():
        setattr(
            education,
            field,
            value,
        )

    db.commit()
    db.refresh(education)

    return education

@router.delete("/{education_id}")
def delete_education(
    education_id: int,
    db: Session = Depends(get_db),
):
    education = (
        db.query(Education)
        .filter(Education.id == education_id)
        .first()
    )

    if education is None:
        raise HTTPException(
            status_code=404,
            detail="Education entry not found",
        )

    db.delete(education)
    db.commit()

    return {
        "message": "Education entry deleted"
    }