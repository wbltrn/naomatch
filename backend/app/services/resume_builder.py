from datetime import datetime

from app.models.profile import (
    UserProfile,
)
from app.schemas.resume import (
    TailoredResumeDocument,
)
from app.services.resume_layout import (
    get_layout,
)


def format_resume_date(
    value: str | None,
) -> str | None:
    if not value:
        return None

    try:
        parsed_date = (
            datetime.strptime(
                value,
                "%Y-%m-%d",
            )
        )

        return parsed_date.strftime(
            "%b %Y"
        )

    except ValueError:
        return value


def build_project_date(
    item: dict,
) -> str | None:
    explicit_date = item.get(
        "date"
    )

    if explicit_date:
        return explicit_date

    start_date = format_resume_date(
        item.get("start_date")
    )

    end_date = format_resume_date(
        item.get("end_date")
    )

    if start_date and end_date:
        if start_date == end_date:
            return start_date

        return (
            f"{start_date} -- "
            f"{end_date}"
        )

    if start_date:
        return start_date

    if end_date:
        return end_date

    return None


def normalize_resume_item(
    item,
    section_type: str,
) -> dict:
    data = item.model_dump(
        exclude_none=True,
        exclude_defaults=True,
    )

    if data.get("start_date"):
        data["start_date"] = (
            format_resume_date(
                data["start_date"]
            )
        )

    if data.get("end_date"):
        data["end_date"] = (
            format_resume_date(
                data["end_date"]
            )
        )

    if data.get("graduation_date"):
        data["graduation_date"] = (
            format_resume_date(
                data[
                    "graduation_date"
                ]
            )
        )

    if section_type in {
        "project",
        "projects",
    }:
        if (
            not data.get("name")
            and data.get("title")
        ):
            data["name"] = (
                data["title"]
            )

        project_date = (
            build_project_date(
                data
            )
        )

        if project_date:
            data["date"] = (
                project_date
            )

    return data


def build_resume_render_data(
    profile: UserProfile,
    tailored_resume:
        TailoredResumeDocument,
    layout_name: str = "balanced",
) -> dict:
    layout = get_layout(
        layout_name
    )

    contact = {
        "name": profile.name,
        "phone": profile.phone,
        "email": profile.email,
        "links": [
            {
                "label": link.label,
                "url": link.url,
            }
            for link in profile.links
        ],
    }

    sections = [
        {
            "section_type": (
                section.section_type
            ),
            "title": section.title,
            "items": [
                normalize_resume_item(
                    item,
                    section.section_type,
                )
                for item in section.items
            ],
        }
        for section
        in tailored_resume.sections
    ]

    return {
        "contact": contact,
        "section_order": (
            tailored_resume.section_order
        ),
        "sections": sections,
        "layout": {
            "name": layout.name,
            "section_before": (
                layout.section_before
            ),
            "section_after_rule": (
                layout.section_after_rule
            ),
            "subheading_before": (
                layout.subheading_before
            ),
            "subheading_after": (
                layout.subheading_after
            ),
            "project_after": (
                layout.project_after
            ),
            "bullet_after": (
                layout.bullet_after
            ),
            "bullet_list_after": (
                layout.bullet_list_after
            ),
            "skills_item_sep": (
                layout.skills_item_sep
            ),
            "skills_top_sep": (
                layout.skills_top_sep
            ),
            "skills_after": (
                layout.skills_after
            ),
        },
    }