from sqlalchemy.orm import Session

from app.models.education import Education
from app.models.experience import Experience
from app.models.skill import Skill


CANONICAL_EXPERIENCE_TYPES = (
    "work",
    "project",
    "leadership",
    "research",
    "volunteer",
    "certification",
    "award",
)


def split_multiline(
    value: str | None,
) -> list[str]:
    if not value:
        return []

    return [
        item.strip()
        for item in value.splitlines()
        if item.strip()
    ]


def build_resume_vault_sections(
    db: Session,
) -> list[dict]:
    sections: list[dict] = []

    # ---------------------------------------------------------
    # Education
    # ---------------------------------------------------------

    education_entries = (
        db.query(Education)
        .order_by(Education.id.asc())
        .all()
    )

    if education_entries:
        sections.append(
            {
                "section_type": "education",
                "items": [
                    {
                        "id": education.id,
                        "school": education.school,
                        "degree": education.degree,
                        "field_of_study": (
                            education.field_of_study
                        ),
                        "minor": education.minor,
                        "location": education.location,
                        "start_date": (
                            education.start_date.isoformat()
                            if education.start_date
                            else None
                        ),
                        "graduation_date": (
                            education.graduation_date.isoformat()
                            if education.graduation_date
                            else None
                        ),
                        "gpa": education.gpa,
                        "coursework": split_multiline(
                            education.coursework
                        ),
                        "honors": split_multiline(
                            education.honors
                        ),
                    }
                    for education in education_entries
                ],
            }
        )

    # ---------------------------------------------------------
    # Experience-style Vault entries
    # ---------------------------------------------------------

    experiences = (
        db.query(Experience)
        .order_by(Experience.id.asc())
        .all()
    )

    grouped_experiences: dict[
        str,
        list[dict],
    ] = {}

    for experience in experiences:
        section_type = (
            experience.type.strip().lower()
        )

        entry = {
            "id": experience.id,
            "source_section_type": section_type,
            "title": experience.title,
            "organization": (
                experience.organization
            ),
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
            "description": (
                experience.description
            ),
            "bullets": [
                bullet.bullet_text
                for bullet in experience.bullets
            ],
        }

        grouped_experiences.setdefault(
            section_type,
            [],
        ).append(entry)

    for section_type in (
        CANONICAL_EXPERIENCE_TYPES
    ):
        items = grouped_experiences.get(
            section_type,
            [],
        )

        if not items:
            continue

        sections.append(
            {
                "section_type": section_type,
                "items": items,
            }
        )

    # Handle legacy data gracefully if an old invalid
    # section still exists in the database.
    for section_type, items in (
        grouped_experiences.items()
    ):
        if (
            section_type
            in CANONICAL_EXPERIENCE_TYPES
        ):
            continue

        sections.append(
            {
                "section_type": section_type,
                "items": items,
            }
        )

    # ---------------------------------------------------------
    # Skills
    # ---------------------------------------------------------

    skills = (
        db.query(Skill)
        .order_by(Skill.id.asc())
        .all()
    )

    if skills:
        skills_by_category: dict[
            str,
            list[str],
        ] = {}

        for skill in skills:
            category = (
                skill.category.strip()
                if skill.category
                else "Other"
            )

            skills_by_category.setdefault(
                category,
                [],
            ).append(skill.name)

        sections.append(
            {
                "section_type": "skills",
                "items": [
                    {
                        "category": category,
                        "skills": skill_names,
                    }
                    for (
                        category,
                        skill_names,
                    ) in skills_by_category.items()
                ],
            }
        )

    return sections