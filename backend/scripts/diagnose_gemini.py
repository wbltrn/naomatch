"""
Find out WHY the full Naomatch tailoring request fails.

Run from the backend folder, with the venv active:

    python -m scripts.diagnose_gemini 2        # 2 = job id

For every model in GEMINI_MODELS it sends three requests and prints the
full error (type, code, status, message) plus timing for each:

  1. ping            tiny prompt (should always work)
  2. plain_json      the REAL prompt, JSON mime type, no response_schema
  3. structured      the REAL prompt, with response_schema (what the app
                     uses first)

How to read the result:
  - ping OK, plain_json OK, structured 503  -> schema-constrained
                                                decoding is the problem;
                                                the app's plain_json
                                                fallback will save you.
  - ping OK, both real requests 503         -> the model is overloaded
                                                for large requests; retries
                                                and the fallback model help.
  - structured 400                          -> the schema itself is being
                                                rejected (message says why).
"""
import sys
import time

from app.database import SessionLocal
from app.models.job import JobPosting
from app.services import resume_tailor as rt
from app.services.resume_vault_context import (
    build_resume_vault_sections,
)


def attempt(label, fn):
    started = time.monotonic()

    try:
        response = fn()
        text = getattr(response, "text", "") or ""
        print(
            f"  {label:<11} OK    "
            f"{time.monotonic() - started:5.1f}s  "
            f"({len(text)} chars returned)"
        )

        if label != "ping":
            try:
                rt.TailoredResumeDocument.model_validate_json(text)
                print(f"  {'':<11}       output validates as TailoredResumeDocument")
            except Exception as error:
                print(f"  {'':<11}       BUT output did not validate: {error}")

    except Exception as error:
        print(
            f"  {label:<11} FAIL  "
            f"{time.monotonic() - started:5.1f}s  "
            f"{rt._describe_gemini_error(error)}"
        )


def main():
    if len(sys.argv) != 2:
        raise SystemExit(
            "usage: python -m scripts.diagnose_gemini <job_id>"
        )

    job_id = int(sys.argv[1])
    db = SessionLocal()

    try:
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()

        if job is None:
            raise SystemExit(f"No job with id {job_id}")

        sections = build_resume_vault_sections(db)
        prompt = rt.build_tailoring_prompt(
            job.title, job.description, sections
        )
    finally:
        db.close()

    print(f"Job {job_id}: {job.title!r}")
    print(f"Prompt size: {len(prompt):,} chars")
    print()

    for model_name in rt.GEMINI_MODELS:
        print(model_name)
        attempt(
            "ping",
            lambda: rt.client.models.generate_content(
                model=model_name,
                contents="Reply with the single word OK.",
            ),
        )
        attempt(
            "plain_json",
            lambda: rt._call_gemini(model_name, "plain_json", prompt),
        )
        attempt(
            "structured",
            lambda: rt._call_gemini(model_name, "structured", prompt),
        )
        print()


if __name__ == "__main__":
    main()
