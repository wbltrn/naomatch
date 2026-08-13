from pydantic import BaseModel


class ProfileLink(BaseModel):
    label: str
    url: str


class UserProfile(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    links: list[ProfileLink] = []