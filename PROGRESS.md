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
- [x] Connect frontend to real API (swap fetch) ............. DONE
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
- 2026-11-17: full backend audit → 3 fixes: home-card score now recomputes
  on every CV write (was frozen at creation), job ids can't collide
  anymore, PUT profile can't silently erase the extracted keywords.
  Known leftovers (deliberate): 6 small doc-vs-code wording drifts, AI
  extract not capped at 15 (fallback still is).
- 2026-11-17: FRONTEND SWAP DONE — every screen now talks to the real
  backend (lib/api.ts fetch helper + NEXT_PUBLIC_API_URL in compose).
  localStorage + mock/ folder deleted. New: JobCard list type, debounced
  PUT for CV edits (flushes before AI calls and on navigate-away),
  aiUsed-aware toasts everywhere. Verified end-to-end in a real browser:
  create (AI) → quick-add persists → translate (AI) → Ask AI (AI) →
  home card → profile autosave/extract/reset — 0 console problems,
  tsc + next build clean.

## RIGHT NOW (the one thing)
**Polish + demo deploy** — loading states, error messages, dark mode,
then a deploy so this can go on my own CV with a live link.

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
- After frontend edits
  without watch running:   docker compose build frontend; docker compose up -d frontend
  (plain `up -d` serves the OLD image — source only syncs under `watch`)
- My notes for the AI:     AGENTS.md (the AI reads that one)
