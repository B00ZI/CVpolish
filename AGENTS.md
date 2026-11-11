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
- **The owner writes the backend themselves to learn Python.** Do NOT write backend feature code (endpoints, models, AI logic). Reference backend contract: `backend/API.md`.
- **Backend review rule (2026-11-07):** in reviews, only REPORT problems with explanations and hints — do NOT fix or edit anything under `backend/`, even small ones. The owner makes every change themselves. Same for compose/backend env wiring. (Exception only if the owner explicitly says "you fix it" for that specific thing.)
- **Swap mock → real API later.** When the backend is ready, mock data gets replaced by real fetch calls. Design the frontend data shapes to match the future API so the swap is easy.

## Product decisions (2026-11-10 — decided with the owner)

- **AI is the product.** Core promise: *paste a job description → AI tailors your CV from your one profile → keyword scan shows gaps → one click for the French version → print PDF.* The owner was stuck because the build had been prioritizing the fallback; that ends now.
- **Fallback = demo safety net only.** It exists so a dead key/quota can't kill a demo. Hard rule 2 still stands (never 500), but from now on a fallback is a `try/except` onto code that already exists — **no new fallback features** (see the fallback inventory appendix in `backend/API.md`).
- **ONE master profile** (English source) replaces the EN/FR dual databases. French is never a profile — it's a **saved translated copy of a job's CV** (`cvFr`), generated once by AI and persisted (owner is broke: free-tier quota means translate once, reuse from DB; `force` to redo).
- **Upload/parse an existing CV** (pdfplumber): explicitly **later, after the core loop** — not abandoned, not now.
- **Audience:** personal use now, but the owner wants this **on their CV with a live demo** → a working fallback matters for the demo, and a deploy step comes after the swap.

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
- [x] `/profile` screen built (2026-10-29): 8 sections (contact, summary, skills, experience, projects, education, certifications, keywords), sticky side nav + scroll-spy, completeness %, autosave to localStorage ("Saved" indicator), mock AI buttons with spinner + toast, add/remove entries & chips, mobile chip nav. Font bug fixed (`--font-sans` was self-referencing → Times; now Geist). Verified in browser: all 8 sections, 50 inputs, 0 console errors
- [x] Docker fixes for frontend dev (2026-10-29): frontend image rebuilt with shadcn deps; **anonymous `/app/node_modules` volume was stale — compose reuses it on recreate, must run `docker compose up -d --renew-anon-volumes frontend` after package.json changes**; stale `.next` cache cleared; added `frontend/.dockerignore` + `backend/.dockerignore` (build context was 200MB)
- [x] `/` home screen built (2026-10-29): saved CV cards (title, company, match %, matched/missing dots, status badge, date), "New CV" CTA, profile completeness nudge (amber when <100%, quiet green check at 100%), empty state, header nav (CVPolish / Your CVs / Profile). Shared helpers extracted: `lib/profile-store.ts` (localStorage fake backend), `lib/completeness.ts`. Verified: 0 console errors
- [x] Dev workflow switched to **`docker compose watch`** (2026-10-29): bind mounts REMOVED from backend+frontend (inotify does not propagate Windows → container, so hot reload was dead); `develop.watch` sync writes files from inside the container → proper file events. Rules: package.json change auto-rebuilds image (watch rule), Fast Refresh verified working (`[Fast Refresh] done`)
- [x] `/jobs/new` screen built (2026-10-31): paste JD + title/company/location, `mockAnalyze()` fake analysis (profile keywords found in the JD text), 1.4s mock delay, saves to `lib/jobs-store.ts` (localStorage `cvpolish.jobs.v1`) then navigates to workspace. Analyze gated on title + JD
- [x] `/jobs/[id]` workspace built (2026-10-31): 3 tabs — **Match & gaps** (score bar, matched chips, missing chips → popover "Save note"/"Add anyway", notes list), **Rewrite** (`mockRewrites()` template diffs, accept/reject per bullet, Accept all, counter), **Preview & PDF** (A4 `cv-preview.tsx` applies accepted rewrites over profile, Print/Save-as-PDF via `window.print()`, `@page A4` + `print:hidden` chrome in globals.css). Jobs persist across reload; home switched from `mockJobs` to `loadJobs()`. Next 16 gotcha: `params` must be read inside `<Suspense>` or dev logs "runtime data during prerendering" — fixed in `app/jobs/[id]/page.tsx`. Verified end-to-end (create → analyze → note → add anyway → generate → accept → preview → reload), 0 console errors

### Dev environment notes
- **Start dev with `docker compose watch`** (NOT plain `up` — without bind mounts, plain `up` serves image files only, no live source)
- Frontend :3000, backend :8000, db :5432; `docker compose ps` to check
- For host-side Python/Pylance checks, select `backend\.venv\Scripts\python.exe` in VS Code; Docker remains the app runtime
- Host `npm.cmd` / `npx.cmd` still used for `tsc`/`build` checks (PowerShell blocks .ps1)
- After adding npm packages on the host: watch rebuilds the image automatically (package.json rule); if watch isn't running: `docker compose build frontend`

### Remaining problems (moved into next steps)
- No `NEXT_PUBLIC_API_URL` yet → part of step 5 (frontend↔API swap)

### Next steps (planned order) — FRONTEND FIRST (backend is owned by the user)
- [x] 1. Hygiene: git init, .gitignore, .env.example, pin requirements, fix compose (healthcheck, CORS, key env) — DONE 2026-10-29
- [x] 2a. Types + realistic mock data (tech-CV structure) — DONE 2026-10-29
- [x] 2b. Frontend screens with mock data — DONE 2026-10-31: `/` home ✅, `/profile` ✅, `/jobs/new` ✅, `/jobs/[id]` workspace ✅ (all 4 routes)
- [x] 3. Frontend polish — DONE 2026-10-31: dark mode (toggle in all headers, no-flash script), edit-from-preview (click-to-edit, routes to profile vs rewrite), edge cases (no analysis / empty matched / empty missing), loading via button spinners. No `app/loading.tsx` (breaks `/jobs/[id]` — see gotchas)
- [x] Print fixes — DONE 2026-11-01: `@page margin:0` (Chrome omits date/title/URL headers+footers), sheet carries own padding, screen spacing (`pb-24`, `min-h-screen`, `mt-6`) stripped in print, flex rows allowed to flow across pages
- [x] CV typography pass — DONE 2026-11-01: body weight 450, semibold entry titles, secondary text neutral-600, unified section rhythm (`mt-6` sections, `space-y-1` bullets, `space-y-4` entries), centered header
- [x] Bilingual EN/FR support — DONE 2026-11-01 (frontend-only, mock phase): `Language = "en" | "fr"`; two profile dbs in localStorage (`cvpolish.profile.v1` EN + `cvpolish.profile.fr.v1` FR); `/jobs/new` asks language FIRST (chooser cards) and jobs store `language`; `/profile` has EN/FR switcher (flushes edits before swapping db); A4 preview + section labels + "Present"/"Class of"/dates localize per job language; home cards show EN/FR badge; full French mock profile (`mockProfileFr`, same entry ids as EN) and MediLink mock job is French. `mockRewrites` emits FR glue text for FR jobs. Old saved jobs default to `en`.
- [x] Workspace single view — DONE 2026-11-04: `/jobs/[id]` tabs replaced by one two-column layout — left (sticky): score + matched/missing chips + AI notes; right: live A4 CV with inline click-to-edit + Print. Rewrite tab REMOVED (edits go straight into the profile); `rewrites` stays on Job type for data compat but is unused in UI. Home E2E flow: `/jobs/new` = language cards → one JD textarea (title auto-read from first line).
- [x] API spec generation-at-creation revision — DONE 2026-11-09: `POST /api/jobs` = AI generates the tailored CV at creation (contact/education/certs verbatim, summary/experience/projects rewritten — reuse/drop/order/never-invent), then machine-verified analysis; fallback = frozen copy + local scan + `aiUsed: false`. New `backend/API.md §4b Keyword scan contract`: ONE rule both ends — canonical `cvText` (now INCLUDES `experience[].technologies`, decision 2026-11-09), universe = masterKeywords, required = in JD, missing = required-not-in-cv, score formula. §4c has a testable JD example (Northwind, expected 83/5/1).
- [x] Frontend contract module — DONE 2026-11-09: `lib/cv-text.ts` (cvText + analyzeForJob = the ONE frontend scan; workspace live scan imports it), `Job.aiUsed?: boolean`, mock jobs get `aiUsed: true`, `/jobs/new` button now "Generate CV" + aiUsed-aware toast. `tsc` clean.
- [x] Backend jobs GET + POST — DONE 2026-11-09 (agent-built, user-authorized exception; built ON their draft `app/routers/job.py`): `GET /api/jobs` → JobCard list newest-first; `POST /api/jobs` → validate 422 / profile 404 → `generate_job()` seam (fallback today: freeze + title-detect + local `analyze_for_job`, `ai_used=false`; user adds the Gemini branch INSIDE this function later) → 201 full Job. `jobs.ai_used` column added (dev db ALTERed live, no data loss). NOTE: no `location` column by design — responses always `location: null`. Verified E2E via TestClient + §4c example: score 83, matched React/TypeScript/Next.js/Tailwind CSS/Git, missing Agile; empty description → 422; backend container rebuilt and serving on :8000.
- [x] Product recenter + **API.md v2** — DONE 2026-11-10 (decided with owner, see "Product decisions" above): AI-first framing, fallback demoted to an appendix; **single profile** (routes `/api/profile`, no `{lang}`); new endpoint **#12 `POST /api/jobs/{id}/translate`** (cache rule: existing `cvFr` returned without a model call unless `force`); `Job` gains `cvFr` + `language` redefined = active version, drops `location`/legacy `rewrites`/`tailored`; `PATCH` gains `language` (422 if no cvFr), `PUT .../cv` gains a `language` selector (which doc is replaced), `JobCard` gains `hasFr`, `CreateJobRequest` = `{description}` only; scan contract §4b unchanged (+FR-viewing note); §4c checklist extended with translate tests. **Build order agreed:** (1) job CRUD #7-10, (2) single-profile migration, (3) AI wiring: `ai.py` helper → #4 → **#6 (the product)** → #12 → #11, (4) frontend swap.
- [x] Frontend to API.md v2, still mock — DONE 2026-11-10: EN/FR duality stripped (profile EN/FR switcher removed, `/jobs/new` language cards removed → straight JD form, `mockProfileFr` renamed `mockCvFr` and kept ONLY as the MediLink job's `cvFr`); honest `aiUsed: false` + toasts everywhere (the "AI-generated CV ready" lie is dead); workspace `updateProfile` writes to the ACTIVE doc (`cv`/`cvFr`), EN/FR `LangToggle` in top bar (FR click with no copy → translate action), translate button honest toast "Needs the backend AI"; home badge `EN · FR` / `FR · EN`; dead code removed (`mockRewrites`, `RewriteDiff`, `TailoredResult`, `job.location`); `jobs-store` normalizes old saves (`cvFr`/`aiUsed`/`language`); `data-scroll-behavior` on `<html>` kills the Next 16 warning. Verified: `tsc --noEmit` clean, `next build` passes, Playwright+Edge smoke test **0 console problems** (generate flow, profile autosave across reload, FR labels on MediLink, toggle EN↔FR both ways, translate toast, home 2→3 cards).
- [x] Backend job CRUD #7-10 — DONE 2026-11-10 (user-written, agent-reviewed per backend rule): GET/{id}, PATCH/{id}, PUT/{id}/cv, DELETE/{id} added to `app/routers/job.py`. Review lessons baked in: SQLAlchemy row never leaves the router raw (`to_response_job` at the exit — same idea as profile's `to_response`); guard order find→404→validate→apply; whitespace-422 guard = `is not None and not .strip()` (None short-circuits; `.strip()` returns str → compare `""` not `0`); PUT cv = `job.cv = body.cv.model_dump()` full replace (JSONB holds an API-shape dict → `**job.cv`, no translator; in-place key mutation is NOT tracked on plain JSONB → must reassign); DELETE = 204 + no `response_model` + no refresh after delete. Live-verified full matrix: 200 (GET, PATCH {}, PUT cv w/ master profile untouched), 204 (DELETE), 404 (wrong-id on GET/PATCH/PUT, GET+DELETE after delete), 422 (blank title). Open cosmetics (owner's): uneven `raise` indent, `id` unannotated on `put_job_cv`, detail double-space, transient `Dep` NameError happened once mid-edit (lesson: uvicorn reload crashes on typos — check `docker logs`).
- [ ] 4. USER builds backend (learning Python), in API.md build order — agent reviews only (report + hints, no backend edits):
  - [x] **(a)** job CRUD #7-10 (GET/PATCH/PUT cv/DELETE — plain, no AI) — DONE 2026-11-10, live-verified
  - [ ] **(b)** single-profile migration (profile routes lose `{lang}`, `profiles` table `id='master'` PK, `jobs` gains `cv_fr`, `CreateJobRequest` loses `language`, PATCH/PUT gain `language`, `JobCard` gains `hasFr`, drop `location` from Job/JobCard schemas)
  - [ ] **(c)** AI wiring: `app/core/ai.py` helper (key + ~10 s timeout + `None` on failure) → #4 AI path → **#6 `generate_job()` Gemini branch (THE product)** → #12 translate → #11 integrate-missing
- [ ] 5. Connect frontend to real API (swap map in API.md §6 — stores, translate button, delete `withDelay`)
- [ ] 6. Polish: loading states, error messages, dark mode. Later (decided 2026-11-10): upload/parse CV (pdfplumber), demo deploy so this can go on the owner's CV with a live link.

---

## How to maintain this file
- Tick checkboxes when done and add the date.
- Keep "Problems found" accurate — remove fixed items.
- If a rule needs to change, ask first, then update the rule section.
