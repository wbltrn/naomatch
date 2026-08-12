from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ApplicationCreate(BaseModel):
    job_id: int
    status: str = "Interested"
    applied_date: date | None = None
    deadline: date | None = None
    notes: str | None = None


class ApplicationResponse(ApplicationCreate):
    id: int
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)