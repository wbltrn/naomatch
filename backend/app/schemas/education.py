from datetime import date

from pydantic import BaseModel, ConfigDict


class EducationBase(BaseModel):
    school: str
    degree: str | None = None
    field_of_study: str | None = None
    minor: str | None = None
    location: str | None = None
    start_date: date | None = None
    graduation_date: date | None = None
    gpa: str | None = None
    coursework: str | None = None
    honors: str | None = None


class EducationCreate(EducationBase):
    pass

class EducationUpdate(EducationBase):
    pass

class EducationResponse(EducationBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )