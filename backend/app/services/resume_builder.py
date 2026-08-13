from app.models.profile import UserProfile
from app.schemas.resume import TailoredResumeDocument


def build_resume_render_data(
    profile: UserProfile,
    tailored_resume: TailoredResumeDocument,
) -> dict:
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
            "section_type": section.section_type,
            "title": section.title,
            "items": [
                {
                    key: value
                    for key, value in item.model_dump(
                        exclude_none=True
                    ).items()
                    if value != []
                }
                for item in section.items
            ],
        }
        for section in tailored_resume.sections
    ]

    return {
        "contact": contact,
        "section_order": tailored_resume.section_order,
        "sections": sections,
    }