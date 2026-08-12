import hashlib
import json
import os

from dotenv import load_dotenv
from google import genai

from app.schemas.match import SemanticMatchResponse

from sqlalchemy.orm import Session

from app.models.semantic_match_cache import SemanticMatchCache


load_dotenv()

SEMANTIC_MATCH_CACHE: dict[str, SemanticMatchResponse] = {}


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def build_semantic_cache_key(
    job_title: str,
    job_description: str,
    experience_title: str,
    experience_organization: str | None,
    experience_description: str | None,
    experience_bullets: list[str],
) -> str:
    payload = {
        "job_title": job_title,
        "job_description": job_description,
        "experience_title": experience_title,
        "experience_organization": experience_organization,
        "experience_description": experience_description,
        "experience_bullets": experience_bullets,
    }

    serialized_payload = json.dumps(
        payload,
        sort_keys=True,
        ensure_ascii=False,
    )

    return hashlib.sha256(
        serialized_payload.encode("utf-8")
    ).hexdigest()


def analyze_semantic_match(
    db: Session,
    job_title: str,
    job_description: str,
    experience_title: str,
    experience_organization: str | None,
    experience_description: str | None,
    experience_bullets: list[str],
) -> SemanticMatchResponse:
    cache_key = build_semantic_cache_key(
        job_title=job_title,
        job_description=job_description,
        experience_title=experience_title,
        experience_organization=experience_organization,
        experience_description=experience_description,
        experience_bullets=experience_bullets,
    )

    # Return the previous result if we've already analyzed
    # this exact job + experience combination.
    if cache_key in SEMANTIC_MATCH_CACHE:
        return SEMANTIC_MATCH_CACHE[cache_key]

    cached_record = (
        db.query(SemanticMatchCache)
        .filter(SemanticMatchCache.cache_key == cache_key)
        .first()
    )

    if cached_record is not None:
        semantic_match = SemanticMatchResponse(
            semantic_score=float(cached_record.semantic_score),
            responsibility_score=float(
                cached_record.responsibility_score
            ),
            technical_score=float(
                cached_record.technical_score
            ),
            domain_score=float(
                cached_record.domain_score
            ),
            evidence_score=float(
                cached_record.evidence_score
            ),
            matched_responsibilities=json.loads(
                cached_record.matched_responsibilities
            ),
            strengths=json.loads(cached_record.strengths),
            gaps=json.loads(cached_record.gaps),
        )

        SEMANTIC_MATCH_CACHE[cache_key] = semantic_match

        return semantic_match

    prompt = f"""
You are evaluating how relevant an engineering experience is to a target job.

Target job title:
{job_title}

Target job description:
{job_description}

Experience title:
{experience_title}

Experience organization:
{experience_organization or "Not provided"}

Experience description:
{experience_description or "Not provided"}

Experience bullets:
{chr(10).join(f"- {bullet}" for bullet in experience_bullets)}

Evaluate semantic relevance, not just exact keyword overlap.

Return:
Return:
- semantic_score from 0 to 100
- responsibility_score from 0 to 100: how well the experience aligns with the actual responsibilities of the job
- technical_score from 0 to 100: how well the technical skills, tools, methods, and engineering capabilities align
- domain_score from 0 to 100: how relevant the engineering domain, industry context, and problem space are
- evidence_score from 0 to 100: how strong and specific the evidence is in the experience description and bullets
- matched_responsibilities: responsibilities from the job that this experience clearly supports
- strengths: strong evidence from the experience that makes it relevant
- gaps: important job requirements that are not clearly supported by this experience

Score conservatively. Do not give high scores based on one isolated skill or vague similarity.
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": SemanticMatchResponse,
            },
        )

        semantic_match = SemanticMatchResponse.model_validate_json(
            response.text
        )

        semantic_match.semantic_score = round(
            (semantic_match.responsibility_score * 0.35)
            + (semantic_match.technical_score * 0.35)
            + (semantic_match.domain_score * 0.15)
            + (semantic_match.evidence_score * 0.15),
            2,
        )

        # Only persist a real Gemini result.
        # Failed calls are handled in the except block and are not cached.
        cached_record = SemanticMatchCache(
            cache_key=cache_key,
            semantic_score=semantic_match.semantic_score,
            responsibility_score=semantic_match.responsibility_score,
            technical_score=semantic_match.technical_score,
            domain_score=semantic_match.domain_score,
            evidence_score=semantic_match.evidence_score,
            matched_responsibilities=json.dumps(
                semantic_match.matched_responsibilities
            ),
            strengths=json.dumps(
                semantic_match.strengths
            ),
            gaps=json.dumps(
                semantic_match.gaps
            ),
        )

        db.add(cached_record)
        db.commit()

        SEMANTIC_MATCH_CACHE[cache_key] = semantic_match

        return semantic_match

    except Exception as error:
        print(f"Semantic matching failed: {error}")

        return SemanticMatchResponse(
            semantic_score=0.0,
            responsibility_score=0.0,
            technical_score=0.0,
            domain_score=0.0,
            evidence_score=0.0,
            matched_responsibilities=[],
            strengths=[],
            gaps=[],
        )