from dataclasses import dataclass
from pathlib import Path

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
    ResumePDFMetrics,
    compile_latex_to_pdf,
    delete_generated_pdf,
    get_pdf_metrics,
)
from app.services.resume_renderer import (
    render_resume_latex,
)


UNDERFILLED_THRESHOLD = 0.85
TARGET_FILL_RATIO = 0.87
MAX_ALTERNATE_ATTEMPTS = 10

LAYOUT_ORDER = [
    "spacious",
    "balanced",
    "compact",
]


@dataclass
class OptimizedResumeResult:
    resume: TailoredResumeDocument
    layout_profile: str
    metrics: ResumePDFMetrics
    pdf_path: Path
    trimmed: bool
    alternate_attempts: int


def get_layout_sequence(
    starting_layout: str,
) -> list[str]:
    try:
        start_index = LAYOUT_ORDER.index(
            starting_layout
        )
    except ValueError:
        start_index = 1

    return LAYOUT_ORDER[start_index:]


def render_resume_candidate(
    profile: UserProfile,
    resume: TailoredResumeDocument,
    layout_name: str,
):
    render_data = build_resume_render_data(
        profile,
        resume,
        layout_name=layout_name,
    )

    latex_content = render_resume_latex(
        render_data
    )

    pdf_path = compile_latex_to_pdf(
        latex_content
    )

    metrics = get_pdf_metrics(
        pdf_path
    )

    return pdf_path, metrics


def optimize_resume_for_one_page(
    profile: UserProfile,
    tailored_resume: TailoredResumeDocument,
) -> OptimizedResumeResult:
    """
    Produce the final one-page resume candidate used by both
    browser preview and PDF download.

    The optimizer:
    1. Runs deterministic content packing.
    2. Tries progressively tighter layouts.
    3. Trims low-priority content only when required.
    4. Promotes strong alternates when useful space remains.
    5. Uses actual rendered PDF measurements as the source of truth.
    """

    packed = pack_tailored_resume(
        tailored_resume
    )

    accepted_resume = packed.resume
    accepted_layout = None
    accepted_metrics = None
    pdf_path = None

    trimmed = packed.trimmed

    # -------------------------------------------------------------
    # Primary render
    # -------------------------------------------------------------

    for layout_name in get_layout_sequence(
        packed.layout_profile
    ):
        (
            candidate_pdf,
            candidate_metrics,
        ) = render_resume_candidate(
            profile=profile,
            resume=accepted_resume,
            layout_name=layout_name,
        )

        if candidate_metrics.page_count == 1:
            pdf_path = candidate_pdf
            accepted_layout = layout_name
            accepted_metrics = candidate_metrics
            break

        delete_generated_pdf(
            candidate_pdf
        )

    # -------------------------------------------------------------
    # Overflow trimming
    # -------------------------------------------------------------

    trim_attempts = 0
    max_trim_attempts = 20

    while (
        pdf_path is None
        and trim_attempts < max_trim_attempts
    ):
        removed = trim_resume_once(
            accepted_resume
        )

        if not removed:
            break

        trimmed = True
        trim_attempts += 1

        (
            candidate_pdf,
            candidate_metrics,
        ) = render_resume_candidate(
            profile=profile,
            resume=accepted_resume,
            layout_name="compact",
        )

        if candidate_metrics.page_count == 1:
            pdf_path = candidate_pdf
            accepted_layout = "compact"
            accepted_metrics = candidate_metrics
            break

        delete_generated_pdf(
            candidate_pdf
        )

    if (
        pdf_path is None
        or accepted_layout is None
        or accepted_metrics is None
    ):
        raise ResumePDFGenerationError(
            "Unable to fit the tailored resume "
            "onto one page without removing "
            "protected content."
        )

    # -------------------------------------------------------------
    # Underfill optimization
    # -------------------------------------------------------------

    alternate_attempts = 0

    for alternate in tailored_resume.alternate_items:
        if (
            alternate_attempts
            >= MAX_ALTERNATE_ATTEMPTS
        ):
            break

        if (
            accepted_metrics.fill_ratio
            >= TARGET_FILL_RATIO
        ):
            break

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

        for candidate_layout in (
            get_layout_sequence(
                accepted_layout
            )
        ):
            (
                candidate_pdf,
                candidate_metrics,
            ) = render_resume_candidate(
                profile=profile,
                resume=candidate_resume,
                layout_name=candidate_layout,
            )

            if (
                candidate_metrics.page_count
                != 1
            ):
                delete_generated_pdf(
                    candidate_pdf
                )

                continue

            if (
                candidate_metrics.fill_ratio
                <= accepted_metrics.fill_ratio
            ):
                delete_generated_pdf(
                    candidate_pdf
                )

                continue

            delete_generated_pdf(
                pdf_path
            )

            pdf_path = candidate_pdf
            accepted_resume = candidate_resume
            accepted_layout = candidate_layout
            accepted_metrics = candidate_metrics
            alternate_accepted = True

            break

        if alternate_accepted:
            continue

    return OptimizedResumeResult(
        resume=accepted_resume,
        layout_profile=accepted_layout,
        metrics=accepted_metrics,
        pdf_path=pdf_path,
        trimmed=trimmed,
        alternate_attempts=(
            alternate_attempts
        ),
    )