import hashlib
import json
import os

from dotenv import load_dotenv
from google import genai

from app.schemas.match import SemanticMatchResponse


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
- semantic_score from 0 to 100
- matched_responsibilities: responsibilities from the job that this experience supports
- strengths: strong evidence from the experience that makes it relevant
- gaps: important job requirements that are not clearly supported by this experience
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

        # Cache Gemini's result so identical requests return
        # the exact same semantic analysis.
        SEMANTIC_MATCH_CACHE[cache_key] = semantic_match

        return semantic_match

    except Exception as error:
        print(f"Semantic matching failed: {error}")

        return SemanticMatchResponse(
            semantic_score=0.0,
            matched_responsibilities=[],
            strengths=[],
            gaps=[],
        )