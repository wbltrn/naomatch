import hashlib
import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import errors

from app.schemas.resume import TailoredResumeContent

from sqlalchemy.orm import Session

from app.models.resume_tailor_cache import ResumeTailorCache


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

RESUME_TAILOR_CACHE: dict[str, TailoredResumeContent] = {}

class ResumeTailoringUnavailableError(Exception):
    pass

def build_resume_tailor_cache_key(
    job_title: str,
    job_description: str,
    experiences: list[dict],
) -> str:
    payload = {
        "job_title": job_title,
        "job_description": job_description,
        "experiences": experiences,
    }

    serialized_payload = json.dumps(
        payload,
        sort_keys=True,
        ensure_ascii=False,
    )

    return hashlib.sha256(
        serialized_payload.encode("utf-8")
    ).hexdigest()

def tailor_resume_content(
    db: Session,
    job_title: str,
    job_description: str,
    experiences: list[dict],
) -> TailoredResumeContent:
    cache_key = build_resume_tailor_cache_key(
        job_title=job_title,
        job_description=job_description,
        experiences=experiences,
    )

    if cache_key in RESUME_TAILOR_CACHE:
        return RESUME_TAILOR_CACHE[cache_key]

    cached_record = (
        db.query(ResumeTailorCache)
        .filter(ResumeTailorCache.cache_key == cache_key)
        .first()
    )

    if cached_record is not None:
        tailored_resume = TailoredResumeContent.model_validate_json(
            cached_record.tailored_resume
        )

        RESUME_TAILOR_CACHE[cache_key] = tailored_resume

        return tailored_resume

    experience_text = "\n\n".join(
        f"""
Experience ID: {experience["id"]}
Title: {experience["title"]}
Organization: {experience.get("organization") or "Not provided"}
Description: {experience.get("description") or "Not provided"}

Bullets:
{chr(10).join(
    f'- {bullet}'
    for bullet in experience.get("bullets", [])
)}
"""
        for experience in experiences
    )

    prompt = f"""
You are tailoring a resume for a specific engineering job.

Target job title:
{job_title}

Target job description:
{job_description}

Candidate experiences:
{experience_text}

Your job is to determine which experiences are most useful for this role
and rewrite relevant resume bullets to better align with the job.

STRICT RULES:
- Do not invent technologies.
- Do not invent metrics.
- Do not invent responsibilities.
- Do not invent accomplishments.
- Do not claim experience that is not supported by the provided source material.
- Preserve factual meaning.
- You may improve wording, clarity, emphasis, and relevance.
- Prefer quantified evidence when it already exists in the source.
- Exclude experiences that do not meaningfully strengthen the resume.
- Every tailored bullet must be traceable to an original bullet.
- targeted_requirements must include only job requirements directly supported
  by the source bullet or experience context.
- Do not list a broader job requirement if only part of it is supported.
  For example, Python automation does not prove REST API experience.
- Do not add requirements from the job description into a bullet unless the
  candidate's original experience actually supports them.

Return structured resume-tailoring data following the provided schema.
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TailoredResumeContent,
            },
        )

    except errors.ClientError as error:
        raise ResumeTailoringUnavailableError(
            "Resume tailoring is temporarily unavailable because the AI service quota was reached."
        ) from error

        tailored_resume = TailoredResumeContent.model_validate_json(
            response.text
        )

        cached_record = ResumeTailorCache(
            cache_key=cache_key,
            tailored_resume=tailored_resume.model_dump_json(),
        )

        db.add(cached_record)
        db.commit()

        RESUME_TAILOR_CACHE[cache_key] = tailored_resume

        return tailored_resume