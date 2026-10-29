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

## Working style (decided 2026-10-29)

- **Frontend first, with mock data.** The UI is built and styled using local mock/fake data so the look can be decided before any API exists. Mock data lives in `frontend/mock/` (or `frontend/lib/`), clearly marked.
- **The owner writes the backend themselves to learn Python.** Do NOT write backend feature code (endpoints, models, AI logic). Help with hints, review, and fixes only when asked.
- **Swap mock → real API later.** When the backend is ready, mock data gets replaced by real fetch calls. Design the frontend data shapes to match the future API so the swap is easy.

## UI decisions (approved 2026-10-29)

- **Style:** clean & minimal — light background, calm neutrals, one accent. The A4 CV preview is the visual star.
- **Navigation:** 3 areas, 4 routes:
  - `/` Home — saved CVs as cards (job title, match %, date) + "New CV" CTA + profile completeness nudge
  - `/profile` — master data editor: **one long scroll + sticky side nav** (Contact, Summary, Experience, Projects, Skills, Education), explicit AI buttons for summary + keyword extraction
  - `/jobs/new` — paste job description
  - `/jobs/[id]` — job workspace with **tabs**: `Match & gaps` → `Rewrite` (before/after diff, accept/reject per bullet) → `Preview & PDF` (A4 template, click-to-edit, browser print)
- **Missing keyword chips:** click → popover with "Add note" (context for AI) or "Add anyway".
- **AI always explicit buttons**, never automatic on load (AI-optional rule).
- **UI library: shadcn/ui (Radix base, Nova preset)** — components in `frontend/components/ui/`: button, input, textarea, label, tabs, card, badge, dialog, popover, sonner. Icons: lucide-react. Hand-build: A4 CV template + print CSS, before/after diff view.
- **Mock phase persistence:** localStorage store so edits feel real with zero backend. Mock data in `frontend/mock/`, types in `frontend/lib/types.ts` shaped like the future API.

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
- [x] Hygiene pass complete (2026-10-29): CORS added in backend (allows http://localhost:3000), `python-multipart` added, all requirements pinned to latest stable, compose `version:` removed, db healthcheck added, backend waits for healthy db, `frentend` typo fixed
- [x] UI plan approved + shadcn/ui installed (2026-10-29): Radix base, Nova preset, 10 components added, `npm run build` passes clean. NOTE: use `npx.cmd` / `npm.cmd` (PowerShell blocks .ps1; owner prefers cmd-style commands)
- [x] Types + realistic mock data (2026-10-29): `lib/types.ts` (MasterProfile, Job, GapAnalysis, RewriteDiff, TailoredResult), `mock/profile.ts` (full tech-CV: contact, ~100-word summary, 5 skill groups, quantified bullets, 3 real-world projects, education, optional cert, 14 keywords), `mock/jobs.ts` (2 jobs: 76% match with gaps + 5 before/after rewrites; 91% completed), `mock/index.ts` barrel with delay helper. `tsc --noEmit` clean

### Remaining problems (moved into next steps)
- `DATABASE_URL` set in compose but unused by backend → fixed in step 4 (USER's backend work)
- Frontend still default template; no `NEXT_PUBLIC_API_URL` → fixed in step 5

### Next steps (planned order) — FRONTEND FIRST (backend is owned by the user)
- [x] 1. Hygiene: git init, .gitignore, .env.example, pin requirements, fix compose (healthcheck, CORS, key env) — DONE 2026-10-29
- [x] 2a. Types + realistic mock data (tech-CV structure) — DONE 2026-10-29
- [ ] 2b. Frontend prototype with mock data: main screens, layout, styling — until the look is approved (order: /profile → / → /jobs/new → /jobs/[id])
- [ ] 3. Frontend polish: before/after suggestion view, loading states, dark mode, export/print view
- [ ] 4. USER builds backend (learning Python): DB models, upload/parse endpoint, then AI layer
- [ ] 5. Connect frontend to real API (replace mock data with fetch calls)
- [ ] 6. Polish: loading states, error messages, dark mode

---

## How to maintain this file
- Tick checkboxes when done and add the date.
- Keep "Problems found" accurate — remove fixed items.
- If a rule needs to change, ask first, then update the rule section.
