import os

from dotenv import load_dotenv
from google import genai
from google.genai import errors

from app.schemas.resume_import import ResumeImportProposal


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


class ResumeParsingUnavailableError(Exception):
    pass


def parse_resume_text(
    resume_text: str,
) -> ResumeImportProposal:
    prompt = f"""
You are parsing a candidate's existing resume into structured data for an experience vault.

IMPORTANT:
- Extract only information explicitly supported by the resume text.
- Do not invent missing dates.
- Do not invent technologies.
- Do not invent metrics.
- Do not invent responsibilities.
- Do not infer work experience that is not present.
- Preserve the candidate's factual information.
- If a field is unavailable, return null or an empty list as appropriate.
- Classify experience entries using the most accurate type supported by the resume.

Common experience types include:
- work
- project
- research
- leadership
- volunteering
- clinical
- teaching
- extracurricular
- other

For skills:
- return individual skills, not one comma-separated string
- preserve useful categories where they are clear from the resume

For links:
- label should be clean human-readable text such as:
  linkedin.com/in/example
  github.com/example
  example.com
- url should be the actual clickable URL when it is present or can be directly reconstructed from the visible link

This output is only a proposed import for user review.
Do not add information beyond the resume.

RESUME TEXT:

{resume_text}
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": ResumeImportProposal,
            },
        )

    except errors.ClientError as error:
        raise ResumeParsingUnavailableError(
            "Resume parsing is temporarily unavailable because "
            "the AI service quota was reached."
        ) from error

    return ResumeImportProposal.model_validate_json(
        response.text
    )