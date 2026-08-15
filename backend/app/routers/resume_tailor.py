from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.job import JobPosting
from app.models.profile import UserProfile
from app.schemas.resume import (
    OptimizedResumePreview,
    TailoredResumeDocument,
)
from app.services.resume_optimizer import (
    optimize_resume_for_one_page,
)
from app.services.resume_pdf import (
    ResumePDFGenerationError,
    delete_generated_pdf,
)
from app.services.resume_tailor import (
    ResumeTailoringUnavailableError,
    tailor_resume_content,
)
from app.services.resume_vault_context import (
    build_resume_vault_sections,
)


router = APIRouter(
    prefix="/resume-tailor",
    tags=["resume-tailor"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_job_or_404(
    db: Session,
    job_id: int,
) -> JobPosting:
    job = (
        db.query(JobPosting)
        .filter(
            JobPosting.id == job_id
        )
        .first()
    )

    if job is None:
        raise HTTPException(
            status_code=404,
            detail="Job posting not found",
        )

    return job


@router.post(
    "/job/{job_id}",
    response_model=TailoredResumeDocument,
    response_model_exclude_none=True,
    response_model_exclude_defaults=True,
)
def tailor_resume_for_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = get_job_or_404(
        db,
        job_id,
    )

    vault_sections = (
        build_resume_vault_sections(
            db
        )
    )

    try:
        return tailor_resume_content(
            db=db,
            job_title=job.title,
            job_description=(
                job.description
            ),
            vault_sections=(
                vault_sections
            ),
        )

    except ResumeTailoringUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error


@router.post(
    "/job/{job_id}/preview",
    response_model=OptimizedResumePreview,
    response_model_exclude_none=True,
    response_model_exclude_defaults=True,
)
def preview_resume_for_job(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = get_job_or_404(
        db,
        job_id,
    )

    profile = (
        db.query(UserProfile)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="User profile not found",
        )

    vault_sections = (
        build_resume_vault_sections(
            db
        )
    )

    optimized = None

    try:
        tailored_resume = (
            tailor_resume_content(
                db=db,
                job_title=job.title,
                job_description=(
                    job.description
                ),
                vault_sections=(
                    vault_sections
                ),
            )
        )

        optimized = (
            optimize_resume_for_one_page(
                profile=profile,
                tailored_resume=(
                    tailored_resume
                ),
            )
        )

        return OptimizedResumePreview(
            resume=optimized.resume,
            layout_profile=(
                optimized.layout_profile
            ),
            page_count=(
                optimized.metrics.page_count
            ),
            fill_ratio=(
                optimized.metrics.fill_ratio
            ),
            trimmed=optimized.trimmed,
            alternate_attempts=(
                optimized.alternate_attempts
            ),
        )

    except ResumeTailoringUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except ResumePDFGenerationError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    finally:
        if optimized is not None:
            delete_generated_pdf(
                optimized.pdf_path
            )


@router.post(
    "/job/{job_id}/pdf",
)
def generate_resume_pdf(
    job_id: int,
    db: Session = Depends(get_db),
):
    job = get_job_or_404(
        db,
        job_id,
    )

    profile = (
        db.query(UserProfile)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="User profile not found",
        )

    vault_sections = (
        build_resume_vault_sections(
            db
        )
    )

    try:
        tailored_resume = (
            tailor_resume_content(
                db=db,
                job_title=job.title,
                job_description=(
                    job.description
                ),
                vault_sections=(
                    vault_sections
                ),
            )
        )

        optimized = (
            optimize_resume_for_one_page(
                profile=profile,
                tailored_resume=(
                    tailored_resume
                ),
            )
        )

        return FileResponse(
            path=optimized.pdf_path,
            media_type="application/pdf",
            filename="tailored_resume.pdf",
        )

    except ResumeTailoringUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except ResumePDFGenerationError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

@router.post(
    "/job/{job_id}/reviewed/preview",
    response_model=OptimizedResumePreview,
    response_model_exclude_none=True,
    response_model_exclude_defaults=True,
)
def preview_reviewed_resume(
    job_id: int,
    reviewed_resume: TailoredResumeDocument,
    db: Session = Depends(get_db),
):
    # Confirm the job still exists.
    get_job_or_404(
        db,
        job_id,
    )

    profile = (
        db.query(UserProfile)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="User profile not found",
        )

    optimized = None

    try:
        optimized = (
            optimize_resume_for_one_page(
                profile=profile,
                tailored_resume=reviewed_resume,
            )
        )

        return OptimizedResumePreview(
            resume=optimized.resume,
            layout_profile=(
                optimized.layout_profile
            ),
            page_count=(
                optimized.metrics.page_count
            ),
            fill_ratio=(
                optimized.metrics.fill_ratio
            ),
            trimmed=optimized.trimmed,
            alternate_attempts=(
                optimized.alternate_attempts
            ),
        )

    except ResumePDFGenerationError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    finally:
        if optimized is not None:
            delete_generated_pdf(
                optimized.pdf_path
            )


@router.post(
    "/job/{job_id}/reviewed/pdf",
)
def generate_reviewed_resume_pdf(
    job_id: int,
    reviewed_resume: TailoredResumeDocument,
    db: Session = Depends(get_db),
):
    # Confirm the job still exists.
    get_job_or_404(
        db,
        job_id,
    )

    profile = (
        db.query(UserProfile)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="User profile not found",
        )

    try:
        optimized = (
            optimize_resume_for_one_page(
                profile=profile,
                tailored_resume=reviewed_resume,
            )
        )

        return FileResponse(
            path=optimized.pdf_path,
            media_type="application/pdf",
            filename="tailored_resume.pdf",
        )

    except ResumePDFGenerationError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error