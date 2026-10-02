# Naomatch

Resume-tailoring app. FastAPI backend (`backend/`), Next.js frontend
(`frontend/`), Supabase Postgres, Gemini for tailoring, LaTeX -> PDF.

## Run locally
- Backend: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload` (http://127.0.0.1:8000)
- Frontend: `cd frontend && npm run dev` (http://localhost:3000)
- Backend `.env` needs `DATABASE_URL` and `GEMINI_API_KEY`.
  Never print, log, or commit `.env` or any key.
- Backend tests: `cd backend && source venv/bin/activate && pytest`

## Goal
Demo interview Oct 14-17, 2026. The priority is ONE stable demo path:
Vault -> Job -> Tailor Resume -> PDF preview -> Edit -> Save/regenerate -> Download.
Feature freeze is Oct 7. See `ROADMAP.md` for the steps in scope.
Do not build roadmap steps I have not named.

## Key files
- `backend/app/services/resume_tailor.py` - Gemini tailoring (retries, model fallback, plain-JSON fallback)
- `backend/app/services/resume_optimizer.py`, `resume_packer.py`, `resume_pdf.py` - one-page fitting and LaTeX/PDF
- `backend/app/routers/resume_tailor.py` - preview / pdf / reviewed endpoints
- `frontend/src/app/jobs/[id]/page.tsx` - tailor + preview + editor UI
- `frontend/src/lib/api.ts` - frontend API client
- `backend/scripts/diagnose_gemini.py`, `warm_tailor_cache.py` - Gemini debugging and demo cache warming

## Rules
- Resume content must stay grounded in Vault data. Never invent employers, dates, metrics, skills, or technologies.
- Do not change database schemas, upgrade packages, or change Gemini models without asking me first.
- Make small changes. One commit per roadmap step, with a clear message.
- After backend changes run pytest. After frontend changes run `npm run build` (or lint) and tell me what to click to verify.
- If you cannot verify something (needs my browser, live Gemini, or Supabase), say so plainly and tell me exactly what to check.
- Existing code style is verbose, one-argument-per-line Python; match it.
