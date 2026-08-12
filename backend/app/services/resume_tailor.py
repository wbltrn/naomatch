import os

from dotenv import load_dotenv
from google import genai
from google.genai import errors

from app.schemas.resume import TailoredResumeContent


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

class ResumeTailoringUnavailableError(Exception):
    pass

def tailor_resume_content(
    job_title: str,
    job_description: str,
    experiences: list[dict],
) -> TailoredResumeContent:
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

    return TailoredResumeContent.model_validate_json(
        response.text
    )