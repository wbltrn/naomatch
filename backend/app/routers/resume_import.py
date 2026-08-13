from sqlalchemy.orm import Session
from fastapi import Depends

from app.database import SessionLocal
from app.schemas.resume_import import ResumeImportConfirm
from app.services.resume_import_confirm import confirm_resume_import

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.resume_importer import (
    ResumeImportError,
    extract_resume_text,
)

from app.services.resume_parser import (
    ResumeParsingUnavailableError,
    parse_resume_text,
)

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

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

@router.post("/confirm")
def confirm_import(
    confirm_data: ResumeImportConfirm,
    db: Session = Depends(get_db),
):
    return confirm_resume_import(
        db=db,
        proposal=confirm_data.proposal,
    )