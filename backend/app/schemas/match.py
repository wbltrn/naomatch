from pydantic import BaseModel

class SemanticMatchResponse(BaseModel):
    semantic_score: float
    matched_responsibilities: list[str]
    strengths: list[str]
    gaps: list[str]

class BulletMatchResponse(BaseModel):
    bullet_id: int
    bullet_text: str
    match_score: float
    matched_keywords: list[str]
    matched_skills: list[str]
    related_skill_matches: list[dict[str, str]]

class ExperienceMatchResponse(BaseModel):
    experience_id: int
    title: str
    organization: str | None = None
    match_score: float
    matched_keywords: list[str]
    matched_skills: list[str]
    related_skill_matches: list[dict[str, str]]
    bullet_matches: list[BulletMatchResponse]