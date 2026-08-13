from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.education import Education
from app.models.experience import Experience
from app.models.skill import Skill


router = APIRouter(
    prefix="/vault",
    tags=["vault"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("")
def get_vault(
    db: Session = Depends(get_db),
):
    education_entries = (
        db.query(Education)
        .order_by(Education.id.asc())
        .all()
    )

    experiences = (
        db.query(Experience)
        .order_by(Experience.id.asc())
        .all()
    )

    skills = (
        db.query(Skill)
        .order_by(Skill.id.asc())
        .all()
    )

    experience_sections: dict[str, list[dict]] = {}

    for experience in experiences:
        section_type = experience.type

        entry = {
            "id": experience.id,
            "title": experience.title,
            "organization": experience.organization,
            "location": experience.location,
            "start_date": experience.start_date,
            "end_date": experience.end_date,
            "description": experience.description,
            "bullets": [
                {
                    "id": bullet.id,
                    "bullet_text": bullet.bullet_text,
                }
                for bullet in experience.bullets
            ],
        }

        experience_sections.setdefault(
            section_type,
            [],
        ).append(entry)

    return {
        "education": [
            {
                "id": entry.id,
                "school": entry.school,
                "degree": entry.degree,
                "field_of_study": entry.field_of_study,
                "minor": entry.minor,
                "location": entry.location,
                "start_date": entry.start_date,
                "graduation_date": entry.graduation_date,
                "gpa": entry.gpa,
                "coursework": entry.coursework,
                "honors": entry.honors,
            }
            for entry in education_entries
        ],
        "experience_sections": [
            {
                "section_type": section_type,
                "items": items,
            }
            for section_type, items in experience_sections.items()
        ],
        "skills": [
            {
                "id": skill.id,
                "category": skill.category,
                "name": skill.name,
            }
            for skill in skills
        ],
    }