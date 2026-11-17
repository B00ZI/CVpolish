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
      4. #12 translate to French .................... NEXT
      5. #11 "Ask AI" missing keywords .............. not started
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

## RIGHT NOW (the one thing)
**#12 translate — POST /api/jobs/{id}/translate (API.md — cache rule FIRST).**
1. Cache rule (quota safety — "I'm broke"): if the job already has cvFr
   and body.force is not true → return the SAVED cvFr with aiUsed: false,
   NO model call. A French CV is paid for once.
2. AI path: load cv → ask Gemini to translate every string to French, keep
   JSON structure + all ids + tech names (React, Docker…) untouched, dates
   localized ("Feb 2023" → "févr. 2023", endDate null → "Aujourd'hui")
   → validate with Pydantic → save cvFr, set language = "fr" → 200.
3. Fallback (no key / fail): cvFr unchanged (or null), aiUsed: false,
   language unchanged. Never 500.

Test against :8000: create a job → POST translate {target:"fr"} →
aiUsed true + cvFr French + language fr → repeat the same POST →
aiUsed false (cache, no model call) → {target:"fr", force:true} →
aiUsed true again. With no key → aiUsed false, nothing changes.

## Next after that (in order)
1. #11 integrate-missing: weave the missing keywords into the active CV
2. Swap frontend from mock data to real fetch calls
3. Polish + deploy so I can put a live link on my own CV

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
