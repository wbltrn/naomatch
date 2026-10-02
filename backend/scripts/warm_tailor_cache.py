"""
Pre-generate and cache the tailored resume for a job so the live demo
does not depend on Gemini being available.

    python -m scripts.warm_tailor_cache 2     # 2 = job id

Tailoring results are cached by (job title + description + vault
contents). After this succeeds, opening Tailor Resume for the same job
reads from the database cache with no Gemini call -- as long as you do
not edit the job or the Vault afterwards. Re-run it after any change.
"""
import sys

from app.database import SessionLocal
from app.models.job import JobPosting
from app.services.resume_tailor import (
    ResumeTailoringUnavailableError,
    tailor_resume_content,
)
from app.services.resume_vault_context import (
    build_resume_vault_sections,
)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(
            "usage: python -m scripts.warm_tailor_cache <job_id>"
        )

    db = SessionLocal()

    try:
        job = (
            db.query(JobPosting)
            .filter(JobPosting.id == int(sys.argv[1]))
            .first()
        )

        if job is None:
            raise SystemExit("Job not found")

        try:
            tailor_resume_content(
                db=db,
                job_title=job.title,
                job_description=job.description,
                vault_sections=build_resume_vault_sections(db),
            )
        except ResumeTailoringUnavailableError as error:
            raise SystemExit(f"FAILED: {error}")

        print(f"Cached tailored resume for job {job.id}: {job.title!r}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
