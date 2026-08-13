from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.resume_importer import (
    ResumeImportError,
    extract_resume_text,
)


router = APIRouter(
    prefix="/vault/import",
    tags=["vault-import"],
)


@router.post("/resume")
async def import_resume(
    file: UploadFile = File(...),
):
    filename = file.filename or ""

    try:
        file_content = await file.read()

        extracted_text = extract_resume_text(
            filename=filename,
            file_content=file_content,
        )

    except ResumeImportError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "filename": filename,
        "extracted_text": extracted_text,
        "status": "review_required",
    }