import hashlib
import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import errors
from sqlalchemy.orm import Session

from app.models.resume_tailor_cache import ResumeTailorCache
from app.schemas.resume import TailoredResumeDocument


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


RESUME_TAILOR_CACHE: dict[str, TailoredResumeDocument] = {}


class ResumeTailoringUnavailableError(Exception):
    pass


def build_resume_tailor_cache_key(
    job_title: str,
    job_description: str,
    vault_sections: list[dict],
) -> str:
    payload = {
        "job_title": job_title,
        "job_description": job_description,
        "vault_sections": vault_sections,
    }

    serialized_payload = json.dumps(
        payload,
        sort_keys=True,
        ensure_ascii=False,
    )

    return hashlib.sha256(
        serialized_payload.encode("utf-8")
    ).hexdigest()


def build_vault_text(
    vault_sections: list[dict],
) -> str:
    section_blocks = []

    for section in vault_sections:
        section_type = section.get(
            "section_type",
            "other",
        )

        item_blocks = []

        for item in section.get("items", []):
            bullet_text = "\n".join(
                f"- {bullet}"
                for bullet in item.get("bullets", [])
            )

            item_blocks.append(
                f"""
Entry ID: {item.get("id")}
Title: {item.get("title") or "Not provided"}
Organization: {item.get("organization") or "Not provided"}
Location: {item.get("location") or "Not provided"}
Start Date: {item.get("start_date") or "Not provided"}
End Date: {item.get("end_date") or "Not provided"}
Description: {item.get("description") or "Not provided"}

Bullets:
{bullet_text or "No bullets provided"}
""".strip()
            )

        section_blocks.append(
            f"""
SECTION TYPE: {section_type}

{chr(10).join(item_blocks)}
""".strip()
        )

    return "\n\n".join(section_blocks)


def tailor_resume_content(
    db: Session,
    job_title: str,
    job_description: str,
    vault_sections: list[dict],
) -> TailoredResumeDocument:
    cache_key = build_resume_tailor_cache_key(
        job_title=job_title,
        job_description=job_description,
        vault_sections=vault_sections,
    )

    if cache_key in RESUME_TAILOR_CACHE:
        return RESUME_TAILOR_CACHE[cache_key]

    cached_record = (
        db.query(ResumeTailorCache)
        .filter(
            ResumeTailorCache.cache_key == cache_key
        )
        .first()
    )

    if cached_record is not None:
        tailored_resume = (
            TailoredResumeDocument.model_validate_json(
                cached_record.tailored_resume
            )
        )

        RESUME_TAILOR_CACHE[cache_key] = tailored_resume

        return tailored_resume

    vault_text = build_vault_text(
        vault_sections
    )

    prompt = f"""
You are building a tailored engineering resume from a candidate's
actual stored resume vault.

TARGET JOB TITLE:
{job_title}

TARGET JOB DESCRIPTION:
{job_description}

CANDIDATE VAULT:
{vault_text}

Your job is to build a tailored resume structure from the candidate's
actual stored information.

You must decide:
- which sections should appear
- which sections are most relevant to the target job
- which entries from each section should be included
- how many entries from each section should be used
- the best section order for this specific job
- which bullets should be rewritten, emphasized, or omitted
- which skills should be emphasized

STRICT RULES:
- Only use sections supported by actual candidate data.
- Do not invent a section just because it appears in the job description.
- Do not invent technologies.
- Do not invent metrics.
- Do not invent responsibilities.
- Do not invent accomplishments.
- Do not claim experience that is not supported by the provided source material.
- Preserve factual meaning.
- You may improve wording, clarity, emphasis, and relevance.
- Prefer quantified evidence when it already exists in the source.
- Exclude entries that do not meaningfully strengthen the resume.
- Every tailored bullet must remain traceable to original candidate evidence.
- targeted_requirements must include only requirements directly supported
  by the source evidence.
- Do not force fixed counts for experiences, projects, research, leadership,
  or other sections.
- Do not force sections such as Projects or Leadership to appear if they
  are not useful or do not exist.
- Choose section order based on the candidate's actual background and the
  target job.
- Preserve the original factual identity of each selected entry.
- Do not transform a project into work experience, research into employment,
  or one section type into another unless the source data supports that type.

Return a TailoredResumeDocument using:
- section_order: ordered list of section_type values
- sections: dynamic resume sections containing only selected candidate information
- skills_to_emphasize: skills already supported by candidate evidence that are
  especially relevant to the job
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TailoredResumeDocument,
            },
        )

    except errors.ClientError as error:
        raise ResumeTailoringUnavailableError(
            "Resume tailoring is temporarily unavailable because "
            "the AI service quota was reached."
        ) from error

    tailored_resume = (
        TailoredResumeDocument.model_validate_json(
            response.text
        )
    )

    cached_record = ResumeTailorCache(
        cache_key=cache_key,
        tailored_resume=tailored_resume.model_dump_json(),
    )

    db.add(cached_record)
    db.commit()

    RESUME_TAILOR_CACHE[cache_key] = tailored_resume

    return tailored_resume