from pydantic import BaseModel


class ImportedLink(BaseModel):
    label: str
    url: str


class ImportedProfile(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    links: list[ImportedLink] = []


class ImportedEducation(BaseModel):
    school: str
    degree: str | None = None
    field_of_study: str | None = None
    minor: str | None = None
    location: str | None = None
    start_date: str | None = None
    graduation_date: str | None = None
    gpa: str | None = None
    coursework: list[str] = []
    honors: list[str] = []


class ImportedExperience(BaseModel):
    type: str
    organization: str | None = None
    title: str
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    bullets: list[str] = []


class ImportedSkill(BaseModel):
    category: str | None = None
    name: str


class ResumeImportProposal(BaseModel):
    profile: ImportedProfile
    education: list[ImportedEducation]
    experiences: list[ImportedExperience]
    skills: list[ImportedSkill]