# My progress — CVPolish
_last updated: 16 Nov 2026_

## What this project is
A tool that takes a job description + my profile → AI tailors my CV → shows
keyword gaps → French version → print PDF. Free AI only. I'm building the
backend myself to learn Python; the AI only reviews.

## The big picture — where each piece stands
- [x] Frontend (all screens, mock data) .................... DONE
- [x] Step (a): job CRUD endpoints .......................... DONE
- [x] Step (b): single master profile migration ............. DONE
- [ ] Step (c): AI wiring .............................. IN PROGRESS
      1. ai.py helper (call the AI) ......... 90% — 1 bug left
      2. #4 extract (keywords from profile) ... not started
      3. #6 generate CV (THE product) ......... not started
      4. #12 translate to French .............. not started
      5. #11 "Ask AI" missing keywords ......... not started
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

## RIGHT NOW (the one thing)
**Finish ai.py — it still needs the try/except.**
Without it, any AI error (quota, timeout, dead key) crashes the endpoint
instead of falling back. The rule: call() NEVER raises, it returns None.
Also still to add: the 10-second timeout (HttpOptions, milliseconds),
delete the bare `settings.GEMINI_API_KEY` line, remove unused `types` import.

Test after fixing (run from project root):
```
docker compose exec backend python -c "from app.core.ai import call; print(repr(call('reply with the single word: ok')))"
```
- key empty (current)  -> must print None
- real free key in .env + docker compose up -d -> must print 'ok'
- get a free key: https://aistudio.google.com -> Get API key

## Next after that (in order)
1. #4 extract-intelligence: add AI path in profile.py before
   derive_intelligence(), same fallback, aiUsed true/false
2. #6 generate_job(): the AI tailors the CV when a job is created (the
   main feature of the whole app)
3. #12 translate: French version, cache rule — never pay twice
4. #11 integrate-missing: weave missing keywords into the CV
5. Swap frontend from mock data to real fetch calls
6. Polish + deploy so I can put a live link on my own CV

## Golden rules (never break)
- Free AI only (Gemini free tier). No paid anything.
- AI is optional: no key / error / quota -> feature degrades, NEVER a 500
- Fallbacks only reuse code that already exists — no new fallback features
- I write all backend code; AI reviews and explains only
- AI calls are explicit buttons, ~10 second max, small flash model

## Handy commands
- Start everything:        docker compose watch
- Check status:            docker compose ps
- Backend logs:            docker logs cvpolish-backend-1
- Frontend type check:     npx.cmd tsc --noEmit   (in frontend/)
- After .env change:       docker compose up -d   (env loads at start only)
- My notes for the AI:     AGENTS.md (the AI reads that one)
