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
- [x] Step (c): AI wiring ................................ DONE
      1. ai.py helper (call the AI) ................. DONE
      2. #4 extract (keywords from profile) ......... DONE
      3. #6 generate CV (THE product) + Option B .... DONE
      4. #12 translate to French .................... DONE
      5. #11 "Ask AI" (free-text CV edit) ........... DONE
- [ ] Connect frontend to real API (swap fetch) ........... NEXT
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
- 2026-11-17: #11 "Ask AI" works — POST {prompt, language} → one free-text
  prompt edits the active CV (minimal diff: only what you asked), 3 guards
  block bad model replies (structure ids, locked contact/education/certs,
  machine timestamps code-wins), fallback returns the doc unchanged.
  Step (c) — ALL FIVE AI pieces done.

## RIGHT NOW (the one thing)
**Frontend swap — replace mock data with real fetch calls (API.md §6).**
The backend is complete: 12 endpoints, all AI branches tested. Every screen
still reads/writes localStorage + mock generators. Swap map (API.md §6):
- `lib/profile-store.ts` → GET/PUT /api/profile
- `lib/jobs-store.ts` → GET /api/jobs, GET/PATCH/PUT/DELETE /api/jobs/{id}
- `mockAnalyze()` → POST /api/jobs
- `mockExtractIntelligence()` → POST /api/profile/extract-intelligence
- `mockAutoFit()` → POST /api/jobs/{id}/integrate-missing
- translate toast → POST /api/jobs/{id}/translate
- delete `withDelay()` fake spinners — real latency
- add NEXT_PUBLIC_API_URL (.env → docker-compose) so the browser can reach
  :8000

Done when: same screens, same states, spinners driven by real requests,
and a full flow works end-to-end with the backend up (create → scan →
Ask AI → translate → edit → print).

## Next after that (in order)
1. Polish + deploy so I can put a live link on my own CV

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
