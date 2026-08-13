from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.skill import Skill
from app.schemas.skill import (
    SkillCreate,
    SkillResponse,
    SkillUpdate,
)


router = APIRouter(
    prefix="/skills",
    tags=["skills"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post(
    "",
    response_model=SkillResponse,
)
def create_skill(
    skill_data: SkillCreate,
    db: Session = Depends(get_db),
):
    skill = Skill(
        **skill_data.model_dump()
    )

    db.add(skill)
    db.commit()
    db.refresh(skill)

    return skill


@router.get(
    "",
    response_model=list[SkillResponse],
)
def get_skills(
    db: Session = Depends(get_db),
):
    return (
        db.query(Skill)
        .order_by(Skill.id.asc())
        .all()
    )


@router.put(
    "/{skill_id}",
    response_model=SkillResponse,
)
def update_skill(
    skill_id: int,
    skill_data: SkillUpdate,
    db: Session = Depends(get_db),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id)
        .first()
    )

    if skill is None:
        raise HTTPException(
            status_code=404,
            detail="Skill not found",
        )

    for field, value in skill_data.model_dump().items():
        setattr(
            skill,
            field,
            value,
        )

    db.commit()
    db.refresh(skill)

    return skill


@router.delete("/{skill_id}")
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
):
    skill = (
        db.query(Skill)
        .filter(Skill.id == skill_id)
        .first()
    )

    if skill is None:
        raise HTTPException(
            status_code=404,
            detail="Skill not found",
        )

    db.delete(skill)
    db.commit()

    return {
        "message": "Skill deleted"
    }