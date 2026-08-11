from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobPostingCreate(BaseModel):
    company: str
    title: str
    location: str | None = None
    job_url: str | None = None
    description: str


class JobPostingResponse(JobPostingCreate):
    id: int
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)