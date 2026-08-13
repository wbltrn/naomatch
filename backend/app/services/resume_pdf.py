import subprocess
import tempfile
from pathlib import Path


class ResumePDFGenerationError(Exception):
    pass


def compile_latex_to_pdf(
    latex_content: str,
) -> Path:
    temp_dir = tempfile.TemporaryDirectory()

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
        temp_dir.cleanup()

        raise ResumePDFGenerationError(
            result.stdout[-4000:]
        )

    if not pdf_path.exists():
        temp_dir.cleanup()

        raise ResumePDFGenerationError(
            "PDF compilation finished without producing a PDF."
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