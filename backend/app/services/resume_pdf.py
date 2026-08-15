import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader

# -------------------------------------------------------------
# Resume page geometry
# -------------------------------------------------------------

# PDF points per inch.
PDF_POINTS_PER_INCH = 72.0

# technical_resume.tex.j2 uses a Letter page and expands the
# standard fullpage text area to approximately 10 vertical inches.
#
# fill_ratio should describe utilization of this usable resume area,
# not utilization of the entire 11-inch physical sheet.
USABLE_RESUME_HEIGHT_INCHES = 10.0
USABLE_RESUME_HEIGHT = (
    USABLE_RESUME_HEIGHT_INCHES
    * PDF_POINTS_PER_INCH
)


class ResumePDFGenerationError(
    Exception
):
    pass


@dataclass(frozen=True)
class ResumePDFMetrics:
    page_count: int
    page_height: float
    content_top: float | None
    content_bottom: float | None
    content_height: float
    fill_ratio: float


def compile_latex_to_pdf(
    latex_content: str,
) -> Path:
    temp_dir = (
        tempfile.TemporaryDirectory()
    )

    work_dir = Path(temp_dir.name)

    tex_path = work_dir / "resume.tex"
    pdf_path = work_dir / "resume.pdf"

    tex_path.write_text(
        latex_content,
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            "pdflatex",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "resume.tex",
        ],
        cwd=work_dir,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        compiler_output = "\n".join(
            [
                result.stdout[-4000:],
                result.stderr[-2000:],
            ]
        ).strip()

        temp_dir.cleanup()

        raise ResumePDFGenerationError(
            compiler_output
        )

    if not pdf_path.exists():
        temp_dir.cleanup()

        raise ResumePDFGenerationError(
            "PDF compilation finished "
            "without producing a PDF."
        )

    output_path = Path(
        tempfile.mkstemp(
            suffix=".pdf",
            prefix="naomatch_resume_",
        )[1]
    )

    output_path.write_bytes(
        pdf_path.read_bytes()
    )

    temp_dir.cleanup()

    return output_path


def get_pdf_page_count(
    pdf_path: Path,
) -> int:
    try:
        reader = PdfReader(
            str(pdf_path)
        )

        return len(reader.pages)

    except Exception as error:
        raise ResumePDFGenerationError(
            "Unable to determine generated "
            "resume page count."
        ) from error


def get_pdf_metrics(
    pdf_path: Path,
) -> ResumePDFMetrics:
    """
    Measure how much vertical space the generated resume actually uses.

    The fill ratio is based on the vertical span between the highest
    and lowest rendered text found on the first page.
    """

    try:
        reader = PdfReader(
            str(pdf_path)
        )

        page_count = len(
            reader.pages
        )

        if page_count == 0:
            raise ResumePDFGenerationError(
                "Generated resume PDF "
                "contains no pages."
            )

        page = reader.pages[0]

        page_height = float(
            page.mediabox.height
        )

        text_positions: list[float] = []

        def visitor_text(
            text,
            cm,
            tm,
            font_dict,
            font_size,
        ):
            if not text.strip():
                return

            y_position = float(
                tm[5]
            )

            text_positions.append(
                y_position
            )

        page.extract_text(
            visitor_text=visitor_text
        )

        if not text_positions:
            return ResumePDFMetrics(
                page_count=page_count,
                page_height=page_height,
                content_top=None,
                content_bottom=None,
                content_height=0.0,
                fill_ratio=0.0,
            )

        content_top = max(
            text_positions
        )

        content_bottom = min(
            text_positions
        )

        content_height = max(
            content_top
            - content_bottom,
            0.0,
        )

        usable_height = min(
            USABLE_RESUME_HEIGHT,
            page_height,
        )

        fill_ratio = min(
            content_height
            / usable_height,
            1.0,
        )

        return ResumePDFMetrics(
            page_count=page_count,
            page_height=round(
                page_height,
                2,
            ),
            content_top=round(
                content_top,
                2,
            ),
            content_bottom=round(
                content_bottom,
                2,
            ),
            content_height=round(
                content_height,
                2,
            ),
            fill_ratio=round(
                fill_ratio,
                4,
            ),
        )

    except ResumePDFGenerationError:
        raise

    except Exception as error:
        raise ResumePDFGenerationError(
            "Unable to measure generated "
            "resume PDF."
        ) from error


def delete_generated_pdf(
    pdf_path: Path | None,
) -> None:
    if (
        pdf_path is not None
        and pdf_path.exists()
    ):
        try:
            pdf_path.unlink()

        except OSError:
            pass