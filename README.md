# Naomatch

Resume-tailoring app. Keeps a structured vault of a candidate's experience,
tailors it to a specific job description with Gemini, fits it to one page,
and renders a PDF via LaTeX.

- `backend/` - FastAPI, Supabase Postgres, Gemini for tailoring, LaTeX -> PDF
- `frontend/` - Next.js

## Run locally

Backend:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

Runs at http://127.0.0.1:8000. Requires a `backend/.env` with `DATABASE_URL`
and `GEMINI_API_KEY`.

Frontend:

```bash
cd frontend
npm run dev
```

Runs at http://localhost:3000.

## Tests

```bash
cd backend
source venv/bin/activate
pytest
```
