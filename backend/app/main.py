from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine

from app.routers.experiences import router as experiences_router

from app.routers.jobs import router as jobs_router

from app.routers.applications import router as applications_router

from app.routers.matches import router as matches_router

from app.models.semantic_match_cache import SemanticMatchCache

from app.models.resume_tailor_cache import ResumeTailorCache

from app.routers.resume_tailor import router as resume_tailor_router

from app.models.profile import ProfileLink, UserProfile

from app.routers.profile import router as profile_router

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(experiences_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(matches_router)
app.include_router(resume_tailor_router)
app.include_router(profile_router)

@app.get("/")
def root():
    return {"message": "Naomatch API is running"}


@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/db-check")
def db_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database": result.scalar()}