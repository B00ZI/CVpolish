# CVPolish — Rules & Progress Tracker

**What it is:** Personal tool to polish a CV fast with AI.
**Goal:** Fast, light, works with **free AI models only**, and **AI must never be required** for the system to work.

Read this file before doing anything. Update it when work is done.

---

## Hard rules (never break these)

1. **FREE AI models only.** No paid APIs, no paid tiers, no credit cards.
   - Primary: **Google Gemini free tier** via `google-genai` (already in requirements).
   - Backup options if needed: Groq free tier, OpenRouter free models, Ollama (local, fully offline).
2. **AI is optional, not required.** Every AI feature must degrade gracefully:
   - Key missing → app works, AI buttons disabled with a clear message.
   - Quota hit / timeout / error → endpoint returns the non-AI result, never a 500.
   - Core features (upload, parse, edit, save, export CV) must work with **zero AI calls**.
3. **Lightweight.** No vector DBs, no embeddings pipelines, no GPU, no Redis. Only: Postgres + FastAPI + Next.js via docker-compose.
4. **Fast.** Small/flash models, strict timeouts on AI calls (target: result in seconds).
5. **Docker is the source of truth.** Everything must run with `docker compose up`.
6. Keep replies and code comments short and in plain English.

---

## Stack & structure

```
CVPolish/
├── docker-compose.yml     db (postgres:15) + backend (:8000) + frontend (:3000)
├── backend/               FastAPI, Python 3.11
│   ├── main.py            app entry (currently only GET /health)
│   ├── requirements.txt   fastapi, uvicorn, pydantic, sqlalchemy, psycopg2-binary, google-genai, pdfplumber
│   └── Dockerfile
└── frontend/              Next.js 16.4.3 + React 19 + Tailwind v4
    └── app/               still the default create-next-app template
```

Frontend note: Next.js 16 here differs from older versions — guides live in
`frontend/node_modules/next/dist/docs/` (see `frontend/AGENTS.md`). Read the relevant guide before writing frontend code.

---

## Progress

### Done
- [x] Scaffold: docker-compose, FastAPI stub, Next.js template (pre-2026-10-29)
- [x] Git repo initialized and pushed to https://github.com/B00ZI/CVpolish (2026-10-29)
- [x] Root `.gitignore` created; `.env.example` created; `backend/__pycache__` deleted
- [x] `GEMINI_API_KEY` env passthrough added to docker-compose backend service
- [x] Fixed: `frontend/` had its own nested `.git` (create-next-app) → was staged as embedded repo, files would NOT have been pushed. Nested `.git` removed, all frontend files now tracked properly

### Problems found — fix first (2026-10-29)
- [ ] No CORS middleware in backend → browser calls from :3000 to :8000 will be blocked
- [ ] `python-multipart` missing from requirements.txt → PDF upload impossible
- [ ] requirements.txt unpinned → pin versions to avoid surprise breaks
- [ ] docker-compose: remove obsolete `version:` key, add db healthcheck
- [ ] `DATABASE_URL` set in compose but unused by backend
- [ ] Frontend still default template; no `NEXT_PUBLIC_API_URL` config
- [ ] `package.json` name typo: `"frentend"` → `"frontend"`

### Next steps (planned order)
- [ ] 1. Hygiene: git init, .gitignore, .env.example, pin requirements, fix compose (healthcheck, CORS, key env)
- [ ] 2. Backend core (AI-free): SQLAlchemy models (CV, Section, Version) + pdfplumber upload/parse endpoint → structured JSON
- [ ] 3. AI layer (optional): `ai.py` service wrapper — Gemini free tier, timeout, returns None on any failure; endpoints take a `use_ai` flag
- [ ] 4. AI polish endpoints: rewrite bullets, tailor to job description, ATS keywords, summary generation
- [ ] 5. Frontend: upload page, CV editor, before/after suggestion view, export (print to PDF)
- [ ] 6. Polish: loading states, error messages, dark mode

---

## How to maintain this file
- Tick checkboxes when done and add the date.
- Keep "Problems found" accurate — remove fixed items.
- If a rule needs to change, ask first, then update the rule section.
