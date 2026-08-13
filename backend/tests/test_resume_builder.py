from app.schemas.resume import (
    ResumeSection,
    ResumeSectionItem,
    TailoredResumeDocument,
)
from app.services.resume_builder import build_resume_render_data


class FakeLink:
    def __init__(self, label, url):
        self.label = label
        self.url = url


class FakeProfile:
    name = "Test Candidate"
    phone = "(555) 123-4567"
    email = "test@example.com"
    links = [
        FakeLink(
            "linkedin.com/in/testcandidate",
            "https://linkedin.com/in/testcandidate",
        )
    ]


tailored_resume = TailoredResumeDocument(
    section_order=[
        "education",
        "experience",
        "technical_skills",
    ],
    sections=[
        ResumeSection(
            section_type="education",
            title="Education",
            items=[
                ResumeSectionItem(
                    school="University of Virginia",
                    location="Charlottesville, VA",
                    degree="Bachelor of Science in Computer Science",
                    graduation_date="May 2027",
                )
            ],
        ),
        ResumeSection(
            section_type="experience",
            title="Experience",
            items=[
                ResumeSectionItem(
                    title="Software Engineer Intern",
                    organization="Example Company",
                    location="New York, NY",
                    start_date="May 2026",
                    end_date="August 2026",
                    bullets=[
                        "Built Python backend services.",
                    ],
                )
            ],
        ),
        ResumeSection(
            section_type="technical_skills",
            title="Technical Skills",
            items=[
                ResumeSectionItem(
                    category="Languages",
                    skills=[
                        "Python",
                        "Java",
                        "SQL",
                    ],
                )
            ],
        ),
    ],
    skills_to_emphasize=[
        "Python",
        "SQL",
    ],
)


render_data = build_resume_render_data(
    FakeProfile(),
    tailored_resume,
)


print(render_data)