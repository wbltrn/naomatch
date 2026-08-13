from io import BytesIO

from docx import Document
from pypdf import PdfReader


class ResumeImportError(Exception):
    pass


def extract_pdf_text(
    file_content: bytes,
) -> str:
    try:
        reader = PdfReader(
            BytesIO(file_content)
        )

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text_parts.append(page_text)

        return "\n".join(text_parts).strip()

    except Exception as error:
        raise ResumeImportError(
            "Unable to extract text from PDF."
        ) from error


def extract_docx_text(
    file_content: bytes,
) -> str:
    try:
        document = Document(
            BytesIO(file_content)
        )

        text_parts = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(text_parts).strip()

    except Exception as error:
        raise ResumeImportError(
            "Unable to extract text from DOCX."
        ) from error


def extract_resume_text(
    filename: str,
    file_content: bytes,
) -> str:
    filename_lower = filename.lower()

    if filename_lower.endswith(".pdf"):
        text = extract_pdf_text(
            file_content
        )

    elif filename_lower.endswith(".docx"):
        text = extract_docx_text(
            file_content
        )

    else:
        raise ResumeImportError(
            "Only PDF and DOCX resumes are supported."
        )

    if not text:
        raise ResumeImportError(
            "No readable text was found in the resume."
        )

    return text