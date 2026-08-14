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


CHRONOLOGICAL_SECTION_TYPES = {
    "experience",
    "project",
    "projects",
    "research",
    "leadership",
    "volunteer",
    "certifications",
    "awards",
}


def parse_resume_date(
    value: str | None,
) -> datetime | None:
    """
    Parse ISO-style Vault dates for sorting.

    If the value is missing or already human-readable, return None so
    the original order can be preserved as a fallback.
    """

    if not value:
        return None

    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        )

    except ValueError:
        return None


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


def chronological_sort_key(
    item,
    original_index: int,
) -> tuple:
    """
    Sort resume items in reverse chronological order.

    Priority:
    1. Current entries first.
    2. Current entries with newer start dates first.
    3. Completed entries with newer end dates first.
    4. If end dates tie, newer start dates first.
    5. Undated entries remain at the bottom in their original order.
    """

    start_date = parse_resume_date(
        item.start_date
    )

    end_date = parse_resume_date(
        item.end_date
    )

    is_current = (
        start_date is not None
        and item.end_date is None
    )

    has_date = (
        start_date is not None
        or end_date is not None
    )

    if is_current:
        return (
            0,
            -(
                start_date.timestamp()
                if start_date
                else 0
            ),
            original_index,
        )

    if has_date:
        effective_end = (
            end_date
            or start_date
        )

        return (
            1,
            -(
                effective_end.timestamp()
                if effective_end
                else 0
            ),
            -(
                start_date.timestamp()
                if start_date
                else 0
            ),
            original_index,
        )

    return (
        2,
        0,
        0,
        original_index,
    )


def sort_section_items(
    section,
):
    """
    Reverse-chronologically sort only resume sections where chronology
    is expected.

    Education and Technical Skills intentionally preserve the order
    produced by the tailoring system.
    """

    if (
        section.section_type
        not in CHRONOLOGICAL_SECTION_TYPES
    ):
        return list(
            section.items
        )

    indexed_items = list(
        enumerate(
            section.items
        )
    )

    sorted_items = sorted(
        indexed_items,
        key=lambda pair: (
            chronological_sort_key(
                pair[1],
                pair[0],
            )
        ),
    )

    return [
        item
        for _, item
        in sorted_items
    ]


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
                for item in (
                    sort_section_items(
                        section
                    )
                )
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