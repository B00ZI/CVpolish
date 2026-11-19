# My progress — CVPolish
_last updated: 17 Nov 2026_

## What this project is
A tool that takes a job description + my profile → AI tailors my CV → shows
keyword gaps → French version → print PDF. Free AI only. I'm building the
backend myself to learn Python; the AI reviews (and builds only when I
explicitly say "do it for me").

## The big picture — where each piece stands
- [x] Frontend (all screens, mock data) .................... DONE
- [x] Step (a): job CRUD endpoints .......................... DONE
- [x] Step (b): single master profile migration ............. DONE
- [ ] Step (c): AI wiring .............................. IN PROGRESS
      1. ai.py helper (call the AI) ................. DONE
      2. #4 extract (keywords from profile) ......... DONE
      3. #6 generate CV (THE product) + Option B .... DONE
      4. #12 translate to French .................... DONE
      5. #11 "Ask AI" missing keywords .............. NEXT
- [ ] Connect frontend to real API (swap fetch) ........... not started
- [ ] Polish + demo deploy ............................... not started

## Done so far (short version)
- 2026-10-29: project scaffolded, UI screens built (home, profile, jobs)
- 2026-10-31: job workspace (match/gaps, rewrite, A4 preview, print)
- 2026-11-10: API contract rewritten (API.md v2), frontend updated to match,
  job CRUD endpoints built + tested, everything pushed to GitHub
- 2026-11-11: single profile migration done + tested + pushed
- 2026-11-14: wrote app/core/ai.py (my first AI connector), fixed the
  empty-key bug and the return-text bug
- 2026-11-17: ai.py finished (timeout + never-raise) and proven with a real
  key; #4 extract works (aiUsed: true, real summary); #6 generate works —
  pasted JD → AI tailored CV + title/company + required keywords, fallback
  proven too. Option B decided: the AI reads the required keywords from the
  JD, code still does all the matched/missing math (scan stays free and
  identical on both sides).
- 2026-11-17: #12 translate works — POST translate {target:"fr"} → AI
  translates every string to French (ids + tech names + timestamps untouched,
  endDate null → "Aujourd'hui"), saved as cvFr, language flips to fr;
  second call is the cache (0.14 s, no model call); force re-runs the model;
  both fallback paths (no copy yet / force with AI dead) return cleanly with
  aiUsed: false and nothing changed.

## RIGHT NOW (the one thing)
**#11 integrate-missing — POST /api/jobs/{id}/integrate-missing (API.md).**
The "Ask AI" button under the missing-keyword chips.
1. Body: {keywords: [...], prompts: [one per keyword], language: "en"|"fr"}.
   language = which CV to edit: en → cv, fr → cv_fr (fr with no cvFr → 422,
   same rule as PUT cv).
2. AI path: read the active CV → ask Gemini to weave each keyword into an
   existing experience/project bullet, using the user's prompt as context,
   never inventing facts → validate → save that CV → 200 {aiUsed: true, cv,
   cvFr} (both docs back, the other one unchanged).
3. Fallback (no key / fail): active CV unchanged, aiUsed: false, same shape.
   Never 500.

Test against :8000: job with missing chips → POST keywords+prompts →
aiUsed true, each keyword now inside a bullet (live scan flips it green),
other CV untouched → repeat with AI dead → aiUsed false, nothing changed.

## Next after that (in order)
1. Swap frontend from mock data to real fetch calls

## Golden rules (never break)
- Free AI only (Gemini free tier). No paid anything.
- AI is optional: no key / error / quota -> feature degrades, NEVER a 500
- Fallbacks only reuse code that already exists — no new fallback features
- I write all backend code; AI reviews and explains only (AI builds only
  when I explicitly say "do it for me")
- AI runs on explicit actions (buttons / creation), flash model, strict timeout
- Scan math (matched/missing/score) stays pure code — AI only reads the JD

## Handy commands
- Start everything:        docker compose watch
- Check status:            docker compose ps
- Backend logs:            docker logs cvpolish-backend-1
- Frontend type check:     npx.cmd tsc --noEmit   (in frontend/)
- After .env change:       docker compose up -d   (env loads at start only)
- My notes for the AI:     AGENTS.md (the AI reads that one)
