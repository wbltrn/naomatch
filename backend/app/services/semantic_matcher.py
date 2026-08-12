import os

from dotenv import load_dotenv
from google import genai

from app.schemas.match import SemanticMatchResponse


load_dotenv()


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

def analyze_semantic_match(
    job_title: str,
    job_description: str,
    experience_title: str,
    experience_organization: str | None,
    experience_description: str | None,
    experience_bullets: list[str],
) -> SemanticMatchResponse:
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

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": SemanticMatchResponse,
        },
    )

    return SemanticMatchResponse.model_validate_json(
        response.text
    )