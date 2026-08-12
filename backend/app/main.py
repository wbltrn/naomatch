from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine

from app.routers.experiences import router as experiences_router

from app.routers.jobs import router as jobs_router

from app.routers.applications import router as applications_router

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