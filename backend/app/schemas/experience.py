from datetime import date, datetime

from pydantic import BaseModel


class ExperienceBulletBase(BaseModel):
    bullet_text: str


class ExperienceBulletCreate(ExperienceBulletBase):
    pass


class ExperienceBulletResponse(ExperienceBulletBase):
    id: int
    experience_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ExperienceBase(BaseModel):
    type: str
    organization: str | None = None
    title: str
    location: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None


class ExperienceCreate(ExperienceBase):
    bullets: list[ExperienceBulletCreate] = []


class ExperienceResponse(ExperienceBase):
    id: int
    created_at: datetime
    bullets: list[ExperienceBulletResponse] = []

    class Config:
        from_attributes = True