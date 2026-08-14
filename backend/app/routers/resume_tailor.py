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
    TailoredResumeDocument,
)
from app.services.resume_builder import (
    build_resume_render_data,
)
from app.services.resume_packer import (
    build_resume_with_alternate,
    pack_tailored_resume,
    trim_resume_once,
)
from app.services.resume_pdf import (
    ResumePDFGenerationError,
    compile_latex_to_pdf,
    delete_generated_pdf,
    get_pdf_metrics,
)
from app.services.resume_renderer import (
    render_resume_latex,
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


# -------------------------------------------------------------------
# Adaptive PDF packing configuration
# -------------------------------------------------------------------

# Based on the real PDF measurement system.
#
# The current test resume measured around 0.819, which still had
# useful visible space near the bottom of the page.
#
# When fill is below this level, Naomatch will try promoting the next
# strongest alternate item.
UNDERFILLED_THRESHOLD = 0.85

# We stop aggressively searching for more content once the resume
# reaches this level. A one-page resume above this point is considered
# well utilized.
TARGET_FILL_RATIO = 0.87

# Safety limit so a malformed alternate list can never create an
# unlimited render loop.
MAX_ALTERNATE_ATTEMPTS = 10

# Layout order from most spacious to most compressed.
LAYOUT_ORDER = [
    "spacious",
    "balanced",
    "compact",
]


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


def get_layout_sequence(
    starting_layout: str,
) -> list[str]:
    """
    Return the starting layout and every tighter layout after it.

    Examples:

    spacious
        -> spacious, balanced, compact

    balanced
        -> balanced, compact

    compact
        -> compact
    """

    try:
        start_index = (
            LAYOUT_ORDER.index(
                starting_layout
            )
        )

    except ValueError:
        start_index = 1

    return LAYOUT_ORDER[
        start_index:
    ]


def render_resume_candidate(
    profile: UserProfile,
    resume: TailoredResumeDocument,
    layout_name: str,
):
    """
    Render one resume/layout combination and return both the PDF path
    and its measured PDF metrics.
    """

    render_data = (
        build_resume_render_data(
            profile,
            resume,
            layout_name=layout_name,
        )
    )

    latex_content = (
        render_resume_latex(
            render_data
        )
    )

    pdf_path = (
        compile_latex_to_pdf(
            latex_content
        )
    )

    metrics = get_pdf_metrics(
        pdf_path
    )

    return pdf_path, metrics


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
            detail=(
                "User profile not found"
            ),
        )

    vault_sections = (
        build_resume_vault_sections(
            db
        )
    )

    pdf_path = None

    try:
        # ---------------------------------------------------------
        # 1. Get AI-tailored content.
        #
        # In normal use this comes from ResumeTailorCache after the
        # first request for this exact job + Vault state.
        # ---------------------------------------------------------

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

        # ---------------------------------------------------------
        # 2. Run deterministic pre-render packing.
        # ---------------------------------------------------------

        packed = (
            pack_tailored_resume(
                tailored_resume
            )
        )

        accepted_resume = (
            packed.resume
        )

        initial_layout_sequence = (
            get_layout_sequence(
                packed.layout_profile
            )
        )

        accepted_layout = None
        accepted_metrics = None

        # ---------------------------------------------------------
        # 3. Render the primary resume.
        #
        # Preserve all packed content first and progressively tighten
        # spacing until we obtain one page.
        # ---------------------------------------------------------

        for layout_name in (
            initial_layout_sequence
        ):
            (
                candidate_pdf,
                candidate_metrics,
            ) = render_resume_candidate(
                profile=profile,
                resume=accepted_resume,
                layout_name=layout_name,
            )

            print(
                "\n===== RESUME PDF METRICS ====="
            )
            print(
                f"stage=primary"
            )
            print(
                f"layout={layout_name}"
            )
            print(
                f"pages={candidate_metrics.page_count}"
            )
            print(
                f"fill_ratio={candidate_metrics.fill_ratio}"
            )
            print(
                f"content_top={candidate_metrics.content_top}"
            )
            print(
                f"content_bottom={candidate_metrics.content_bottom}"
            )
            print(
                "==============================\n"
            )

            if (
                candidate_metrics.page_count
                == 1
            ):
                pdf_path = (
                    candidate_pdf
                )

                accepted_layout = (
                    layout_name
                )

                accepted_metrics = (
                    candidate_metrics
                )

                break

            delete_generated_pdf(
                candidate_pdf
            )

        # ---------------------------------------------------------
        # 4. If every spacing profile overflowed, trim the weakest
        #    selected content one piece at a time.
        # ---------------------------------------------------------

        trim_attempts = 0
        max_trim_attempts = 20

        while (
            pdf_path is None
            and trim_attempts
            < max_trim_attempts
        ):
            removed = (
                trim_resume_once(
                    accepted_resume
                )
            )

            if not removed:
                break

            trim_attempts += 1

            (
                candidate_pdf,
                candidate_metrics,
            ) = render_resume_candidate(
                profile=profile,
                resume=accepted_resume,
                layout_name="compact",
            )

            print(
                "\n===== RESUME PDF METRICS ====="
            )
            print(
                "stage=trim"
            )
            print(
                "layout=compact"
            )
            print(
                f"pages={candidate_metrics.page_count}"
            )
            print(
                f"fill_ratio={candidate_metrics.fill_ratio}"
            )
            print(
                "==============================\n"
            )

            if (
                candidate_metrics.page_count
                == 1
            ):
                pdf_path = (
                    candidate_pdf
                )

                accepted_layout = (
                    "compact"
                )

                accepted_metrics = (
                    candidate_metrics
                )

                break

            delete_generated_pdf(
                candidate_pdf
            )

        if (
            pdf_path is None
            or accepted_layout is None
            or accepted_metrics is None
        ):
            raise (
                ResumePDFGenerationError(
                    "Unable to fit the "
                    "tailored resume onto "
                    "one page without "
                    "removing protected "
                    "content."
                )
            )

        # ---------------------------------------------------------
        # 5. UNDERFILL OPTIMIZATION
        #
        # If the actual rendered page still has room, try Gemini's
        # ranked alternates strongest-first.
        #
        # IMPORTANT:
        # No Gemini calls happen here.
        # ---------------------------------------------------------

        alternate_attempts = 0

        for alternate_index, alternate in enumerate(
            tailored_resume.alternate_items
        ):
            if (
                alternate_attempts
                >= MAX_ALTERNATE_ATTEMPTS
            ):
                break

            # Once the page is well utilized,
            # stop trying to add more material.
            if (
                accepted_metrics.fill_ratio
                >= TARGET_FILL_RATIO
            ):
                break

            # Only promote alternates when the
            # page is genuinely underfilled.
            if (
                accepted_metrics.fill_ratio
                >= UNDERFILLED_THRESHOLD
            ):
                break

            alternate_attempts += 1

            candidate_resume = (
                build_resume_with_alternate(
                    accepted_resume,
                    alternate,
                )
            )

            if candidate_resume is None:
                continue

            alternate_accepted = False

            # Start from the current accepted layout.
            # If the alternate does not fit, tighten spacing before
            # rejecting strong evidence.
            alternate_layouts = (
                get_layout_sequence(
                    accepted_layout
                )
            )

            for candidate_layout in (
                alternate_layouts
            ):
                (
                    candidate_pdf,
                    candidate_metrics,
                ) = render_resume_candidate(
                    profile=profile,
                    resume=candidate_resume,
                    layout_name=(
                        candidate_layout
                    ),
                )

                print(
                    "\n===== ALTERNATE TEST ====="
                )
                print(
                    f"alternate_rank={alternate_index + 1}"
                )
                print(
                    "alternate="
                    f"{alternate.item.title or alternate.item.name}"
                )
                print(
                    f"layout={candidate_layout}"
                )
                print(
                    f"pages={candidate_metrics.page_count}"
                )
                print(
                    f"fill_ratio={candidate_metrics.fill_ratio}"
                )
                print(
                    "==========================\n"
                )

                # ---------------------------------------------
                # Candidate must remain one page.
                # ---------------------------------------------

                if (
                    candidate_metrics.page_count
                    != 1
                ):
                    delete_generated_pdf(
                        candidate_pdf
                    )

                    continue

                # ---------------------------------------------
                # Candidate must actually improve utilization.
                # ---------------------------------------------

                if (
                    candidate_metrics.fill_ratio
                    <= accepted_metrics.fill_ratio
                ):
                    delete_generated_pdf(
                        candidate_pdf
                    )

                    continue

                # ---------------------------------------------
                # Accept the stronger, fuller candidate.
                # ---------------------------------------------

                delete_generated_pdf(
                    pdf_path
                )

                pdf_path = (
                    candidate_pdf
                )

                accepted_resume = (
                    candidate_resume
                )

                accepted_layout = (
                    candidate_layout
                )

                accepted_metrics = (
                    candidate_metrics
                )

                alternate_accepted = True

                print(
                    "\n===== ALTERNATE ACCEPTED ====="
                )
                print(
                    f"alternate_rank={alternate_index + 1}"
                )
                print(
                    "alternate="
                    f"{alternate.item.title or alternate.item.name}"
                )
                print(
                    f"new_fill_ratio={accepted_metrics.fill_ratio}"
                )
                print(
                    f"layout={accepted_layout}"
                )
                print(
                    "==============================\n"
                )

                break

            # If an alternate could not fit even after trying tighter
            # layouts, reject it and move to the next ranked alternate.
            if not alternate_accepted:
                print(
                    "\n===== ALTERNATE REJECTED ====="
                )
                print(
                    f"alternate_rank={alternate_index + 1}"
                )
                print(
                    "alternate="
                    f"{alternate.item.title or alternate.item.name}"
                )
                print(
                    "reason=did not improve "
                    "the one-page resume"
                )
                print(
                    "==============================\n"
                )

        # ---------------------------------------------------------
        # 6. Final diagnostic output
        # ---------------------------------------------------------

        print(
            "\n===== FINAL RESUME ====="
        )
        print(
            f"layout={accepted_layout}"
        )
        print(
            f"pages={accepted_metrics.page_count}"
        )
        print(
            f"fill_ratio={accepted_metrics.fill_ratio}"
        )
        print(
            f"alternates_attempted={alternate_attempts}"
        )
        print(
            "========================\n"
        )

    except ResumeTailoringUnavailableError as error:
        if pdf_path is not None:
            delete_generated_pdf(
                pdf_path
            )

        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except ResumePDFGenerationError as error:
        if pdf_path is not None:
            delete_generated_pdf(
                pdf_path
            )

        print(
            "\n===== PDF GENERATION ERROR ====="
        )
        print(
            str(error)
        )
        print(
            "================================\n"
        )

        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename="tailored_resume.pdf",
    )