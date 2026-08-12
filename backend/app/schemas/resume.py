from pydantic import BaseModel


class TailoredBullet(BaseModel):
    original_bullet: str
    tailored_bullet: str
    targeted_requirements: list[str]
    reason: str


class TailoredExperience(BaseModel):
    experience_id: int
    title: str
    organization: str | None
    include: bool
    relevance_reason: str
    bullets: list[TailoredBullet]


class TailoredResumeContent(BaseModel):
    experiences: list[TailoredExperience]
    skills_to_emphasize: list[str]