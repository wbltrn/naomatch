from pydantic import BaseModel


class TailoredBullet(BaseModel):
    original_bullet: str
    tailored_bullet: str
    targeted_requirements: list[str]
    reason: str


class ResumeSectionItem(BaseModel):
    id: int | None = None

    # Source traceability
    source_section_type: str | None = None

    # Common entry fields
    title: str | None = None
    organization: str | None = None
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None

    # Education-specific fields
    school: str | None = None
    degree: str | None = None
    field_of_study: str | None = None
    minor: str | None = None
    gpa: str | None = None
    graduation_date: str | None = None
    coursework: list[str] = []
    honors: list[str] = []

    # Project-specific fields
    name: str | None = None
    date: str | None = None
    technologies: list[str] = []

    # Skills-specific fields
    category: str | None = None
    skills: list[str] = []

    # Resume content
    bullets: list[str] = []


class ResumeSection(BaseModel):
    section_type: str
    title: str
    items: list[ResumeSectionItem]


class ResumeAlternate(BaseModel):
    """
    Strong candidate evidence that did not make the initial resume
    but may be promoted if the rendered page has room.

    Alternates must be returned strongest-first.
    """

    section_type: str
    section_title: str
    item: ResumeSectionItem
    reason: str


class TailoredResumeDocument(BaseModel):
    section_order: list[str]
    sections: list[ResumeSection]
    skills_to_emphasize: list[str]

    # Ranked strongest-first.
    alternate_items: list[ResumeAlternate] = []

class OptimizedResumePreview(BaseModel):
    resume: TailoredResumeDocument
    layout_profile: str
    page_count: int
    fill_ratio: float
    trimmed: bool
    alternate_attempts: int