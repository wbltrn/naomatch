from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.resume_importer import (
    ResumeImportError,
    extract_resume_text,
)

from app.services.resume_parser import (
    ResumeParsingUnavailableError,
    parse_resume_text,
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

        proposal = parse_resume_text(
                extracted_text
            )

    except ResumeImportError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
    
    except ResumeParsingUnavailableError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    return {
        "filename": filename,
        "extracted_text": extracted_text,
        "proposal": proposal.model_dump(),
        "status": "review_required",
    }