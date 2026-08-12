from pydantic import BaseModel

class SemanticMatchResponse(BaseModel):
    semantic_score: float
    responsibility_score: float
    technical_score: float
    domain_score: float
    evidence_score: float
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
    deterministic_score: float
    final_score: float | None = None
    semantic_match: SemanticMatchResponse | None = None
    matched_keywords: list[str]
    matched_skills: list[str]
    related_skill_matches: list[dict[str, str]]
    bullet_matches: list[BulletMatchResponse]