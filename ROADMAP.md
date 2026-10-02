# Naomatch roadmap (trimmed for demo, interview Oct 14-17, 2026)

Plan dates assume the earliest interview date, Oct 14.

## Schedule
| Dates | Goal | Steps |
|---|---|---|
| Oct 2-4 | Tailoring pipeline reliable (Gemini blocker, optimizer, friendly errors) | 1, 15, 16 (AI path only) |
| Oct 5-6 | Resume editor + content controls | 2, 3 |
| Oct 7 | FEATURE FREEZE. Vault CRUD + job flow coherent, test records removed | 11, 12 (demo parts) |
| Oct 8-9 | Visual consistency on demo pages, then full QA + bug fixes | 17 (light) |
| Oct 10-11 | Final dataset and real job description chosen, cache warmed, everything committed and pushed | none |
| Oct 12 | Practice the full demo several times | none |
| Oct 13 | No coding unless the demo is completely broken | none |

## In scope for the demo
1. Resume Optimizer Finalization - reliable one-page fit, less wasted whitespace, better fill ratio.
2. Resume Editor Completion - edit the AI-tailored resume; changes reflected in the PDF preview.
3. Resume Content Controls - add/remove/reorder whole items and individual bullets.
11. Vault Frontend Completion - profile, education, work, projects, leadership, skills display correctly.
12. Vault CRUD & Manual Entry - add/edit/delete works from the frontend.
15. Tailoring Quality Pass - prompts, factual grounding, section organization.
16. Error & Edge-Case Hardening - AI failures, loading states, missing data, friendly messages.
17. Full UI/UX Revamp - LIGHT pass only: consistent navigation, cards, buttons, spacing on pages shown in the demo (home page looks older than /vault and /jobs/[id]).

## Optional (only if ahead of schedule before Oct 7)
4. Tailoring Transparency - show what changed/emphasized and why.

## Out of scope until after the interview
5 Job Match Analysis, 6 Application Tracking, 7 Application Metadata, 8 Dashboard,
9 Resume History, 10 Resume Management, 13 Resume Import, 14 Job Import Improvements,
18 Production Readiness, 19 Testing & Deployment, 20 Final QA & Launch.

## Demo path (must work every time)
Vault -> add/view job -> /jobs/[id] -> Tailor Resume -> PDF preview -> edit -> save -> regenerate PDF -> download.

## Known issues to fix
- Gemini structured-output request returns 503 for the full tailoring prompt (a trivial request works). See backend/scripts/diagnose_gemini.py.
- Home page "View Job Posting" opens the external posting; the demo needs the internal job page (/jobs/[id]) and a natural way to reach Tailor Resume.
- Remove obvious test records (e.g. "current test") from the Vault before the final dataset is frozen.
- Demo should survive a Gemini outage: warm the cache for the demo job with `python -m scripts.warm_tailor_cache <job_id>`.

## Demo story
Job seekers rewrite the same resume for every application. Naomatch keeps a structured vault of everything I've done, analyzes a job description, selects and rewrites the most relevant material, fits it to one page, and still gives me final control.
