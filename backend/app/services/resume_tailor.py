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


RESUME_TAILOR_CACHE: dict[
    str,
    TailoredResumeDocument,
] = {}


# Increment this whenever the structure or behavior of
# TailoredResumeDocument changes in a way that should invalidate
# previously cached tailoring results.
TAILORING_SCHEMA_VERSION = "3"


class ResumeTailoringUnavailableError(
    Exception
):
    pass


def build_resume_tailor_cache_key(
    job_title: str,
    job_description: str,
    vault_sections: list[dict],
) -> str:
    payload = {
        "schema_version": (
            TAILORING_SCHEMA_VERSION
        ),
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

        for item in section.get(
            "items",
            [],
        ):
            # -----------------------------------------------------
            # Skills
            # -----------------------------------------------------

            if section_type == "skills":
                item_blocks.append(
                    f"""
Category: {item.get("category") or "Other"}
Skills: {", ".join(item.get("skills", []))}
""".strip()
                )

                continue

            # -----------------------------------------------------
            # Education
            # -----------------------------------------------------

            if section_type == "education":
                coursework = "\n".join(
                    f"- {course}"
                    for course in item.get(
                        "coursework",
                        [],
                    )
                )

                honors = "\n".join(
                    f"- {honor}"
                    for honor in item.get(
                        "honors",
                        [],
                    )
                )

                item_blocks.append(
                    f"""
Entry ID: {item.get("id")}
School: {item.get("school") or "Not provided"}
Degree: {item.get("degree") or "Not provided"}
Field of Study: {item.get("field_of_study") or "Not provided"}
Minor: {item.get("minor") or "Not provided"}
Location: {item.get("location") or "Not provided"}
Start Date: {item.get("start_date") or "Not provided"}
Graduation Date: {item.get("graduation_date") or "Not provided"}
GPA: {item.get("gpa") or "Not provided"}

Coursework:
{coursework or "No coursework provided"}

Honors:
{honors or "No honors provided"}
""".strip()
                )

                continue

            # -----------------------------------------------------
            # Experience-style entries
            # -----------------------------------------------------

            bullets = "\n".join(
                f"- {bullet}"
                for bullet in item.get(
                    "bullets",
                    [],
                )
            )

            item_blocks.append(
                f"""
Entry ID: {item.get("id")}
Source Section Type: {item.get("source_section_type", section_type)}
Title: {item.get("title") or "Not provided"}
Organization: {item.get("organization") or "Not provided"}
Location: {item.get("location") or "Not provided"}
Start Date: {item.get("start_date") or "Not provided"}
End Date: {item.get("end_date") or "Not provided"}
Description: {item.get("description") or "Not provided"}

Bullets:
{bullets or "No bullets provided"}
""".strip()
            )

        section_blocks.append(
            f"""
VAULT SECTION TYPE: {section_type}

{chr(10).join(item_blocks)}
""".strip()
        )

    return "\n\n".join(
        section_blocks
    )


def tailor_resume_content(
    db: Session,
    job_title: str,
    job_description: str,
    vault_sections: list[dict],
) -> TailoredResumeDocument:
    cache_key = (
        build_resume_tailor_cache_key(
            job_title=job_title,
            job_description=(
                job_description
            ),
            vault_sections=vault_sections,
        )
    )

    # -------------------------------------------------------------
    # In-memory cache
    # -------------------------------------------------------------

    if cache_key in RESUME_TAILOR_CACHE:
        return RESUME_TAILOR_CACHE[
            cache_key
        ]

    # -------------------------------------------------------------
    # Database cache
    # -------------------------------------------------------------

    cached_record = (
        db.query(ResumeTailorCache)
        .filter(
            ResumeTailorCache.cache_key
            == cache_key
        )
        .first()
    )

    if cached_record is not None:
        tailored_resume = (
            TailoredResumeDocument.model_validate_json(
                cached_record.tailored_resume
            )
        )

        RESUME_TAILOR_CACHE[
            cache_key
        ] = tailored_resume

        return tailored_resume

    # -------------------------------------------------------------
    # Build AI context
    # -------------------------------------------------------------

    vault_text = build_vault_text(
        vault_sections
    )

    prompt = f"""
You are building a highly targeted professional resume from a candidate's
trusted Experience Vault.

TARGET JOB TITLE:
{job_title}

TARGET JOB DESCRIPTION:
{job_description}

FULL CANDIDATE VAULT:
{vault_text}

The Vault stores factual candidate information using canonical source
categories. Those categories describe WHAT each item actually is.

Canonical Vault categories include:
- education
- work
- project
- leadership
- research
- volunteer
- certification
- award
- skills

The generated resume has a different purpose: it decides WHERE the strongest
candidate evidence should be presented for this particular job.

For example:
- Vault category "work" will normally appear under "Experience".
- A highly relevant research role may appear under "Research" or under
  "Experience" when that produces a stronger truthful resume.
- Leadership may remain under "Leadership & Activities", or a highly
  relevant professional-style leadership entry may appear under
  "Experience".
- Projects will normally appear under "Projects".
- Education should normally remain Education.
- Skills should normally remain Technical Skills.

Moving an entry to another PRESENTATION section does not change what the
entry actually is.

Every selected experience-style item MUST preserve source_section_type so
Naomatch can trace it back to its true Vault category.

Your goal is to produce the strongest truthful one-page resume candidate
possible using only evidence actually present in the Vault.

You must produce TWO levels of evidence:

1. PRIMARY RESUME CONTENT
   This is the content that should appear on the initial tailored resume.

2. RANKED ALTERNATE ITEMS
   These are strong, relevant Vault entries that did not make the primary
   resume because of page-space or relative-priority considerations.

Naomatch may later render the primary resume and discover that additional
page space remains. If so, alternate_items will be promoted one at a time,
strongest-first, as long as the resume remains one page.

PRIMARY CONTENT RULES:
- Select the strongest job-relevant candidate evidence.
- Prefer direct professional relevance.
- Prefer quantified accomplishments when available.
- Include only sections that strengthen the application.
- Do not dump the entire Vault.
- Do not intentionally underfill the primary resume merely because
  alternate_items exist.
- The primary resume should already be a strong standalone resume.

ALTERNATE ITEMS RULES:
- alternate_items must contain ONLY genuinely useful evidence.
- Never include weak filler just to create alternates.
- Do not include items already present in the primary resume.
- Rank alternates strongest-first.
- The first alternate should be the strongest omitted evidence.
- Each alternate must preserve its original factual identity.
- Each alternate must specify:
  - section_type: the PRESENTATION section where it should be inserted
  - section_title: human-readable title for that resume section
  - item: the complete ResumeSectionItem
  - reason: why this omitted item is useful for the target job
- A project alternate should normally use section_type "projects".
- A work alternate should normally use section_type "experience".
- A leadership alternate may use "leadership" or "experience" depending
  on relevance and truthful presentation.
- Do not return an alternate simply because it exists in the Vault.
- Returning zero alternates is acceptable when no omitted evidence is
  strong enough.

CONTENT PRIORITY:
1. Directly relevant professional evidence
2. Strong quantified accomplishments
3. Relevant technical skills and tools
4. Relevant projects or research
5. Strong relevant leadership
6. Relevant education and coursework
7. Other supporting evidence that materially improves the application

STRICT FACTUAL RULES:
- Use only information provided in the candidate Vault.
- Never invent technologies.
- Never invent metrics.
- Never invent responsibilities.
- Never invent accomplishments.
- Never invent employers.
- Never invent organizations.
- Never invent schools.
- Never invent awards.
- Never invent certifications.
- Never invent projects.
- Never invent dates.
- Never invent coursework.
- Never invent skills.
- Never imply experience unsupported by the source data.
- Preserve factual meaning.
- Preserve the factual identity of every selected entry.
- Preserve source_section_type for selected experience-style entries.
- Every rewritten bullet must remain traceable to source evidence.
- You may improve wording, clarity, concision, emphasis, and relevance.
- Prefer quantified evidence when the source already contains metrics.
- Do not add a keyword merely because it occurs in the job description.
- Do not force every Vault section onto the resume.
- Do not force fixed counts for entries or bullets.
- Exclude weak or irrelevant evidence.
- Do not create empty sections.

BULLET RULES:
- Stronger bullets should appear before weaker bullets inside each item.
- This ordering matters because Naomatch's deterministic page packer may
  remove later bullets first if a resume becomes too long.
- Preserve the strongest bullet evidence near the beginning of each item.
- Avoid redundant bullets that communicate essentially the same value.

ENTRY ORDER RULES:
- Stronger entries should appear before weaker entries within a section.
- This ordering matters because Naomatch may remove later entries first
  if the generated resume exceeds one page.

EDUCATION RULES:
- Education information must come directly from Education Vault data.
- Preserve school, degree, field_of_study, minor, GPA, and dates.
- Include only coursework or honors actually present in the Vault.
- Relevant coursework may be selectively included.
- Do not invent honors or courses.

SKILLS RULES:
- Only include skills actually present in the Vault or directly supported
  by candidate evidence.
- Prefer skills aligned with the target job.
- Group skills into clear categories.
- skills_to_emphasize must contain only supported candidate skills.

PRESENTATION RULES:
- section_order must contain the section_type values actually used in
  primary resume sections.
- Every section_type in section_order must correspond to exactly one
  returned primary section.
- Use stable presentation section_type values such as:
  education
  experience
  projects
  research
  leadership
  volunteer
  certifications
  awards
  skills
- Use professional human-readable section titles such as:
  Education
  Experience
  Projects
  Research
  Leadership & Activities
  Volunteer Experience
  Certifications
  Awards & Honors
  Technical Skills
- The final primary structure should resemble a concise professional
  resume, not a database export.

Return a TailoredResumeDocument containing:
- section_order
- sections
- skills_to_emphasize
- alternate_items
"""

    # -------------------------------------------------------------
    # Gemini request
    # -------------------------------------------------------------

    try:
        response = (
            client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
                config={
                    "response_mime_type": (
                        "application/json"
                    ),
                    "response_schema": (
                        TailoredResumeDocument
                    ),
                },
            )
        )

    except errors.ClientError as error:
        raise (
            ResumeTailoringUnavailableError(
                "Resume tailoring is "
                "temporarily unavailable "
                "because the AI service "
                "quota was reached."
            )
        ) from error

    # -------------------------------------------------------------
    # Validate response
    # -------------------------------------------------------------

    tailored_resume = (
        TailoredResumeDocument.model_validate_json(
            response.text
        )
    )

    # -------------------------------------------------------------
    # Store new cache result
    # -------------------------------------------------------------

    cached_record = ResumeTailorCache(
        cache_key=cache_key,
        tailored_resume=(
            tailored_resume.model_dump_json()
        ),
    )

    db.add(
        cached_record
    )

    db.commit()

    RESUME_TAILOR_CACHE[
        cache_key
    ] = tailored_resume

    return tailored_resume