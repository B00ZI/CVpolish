# My progress — CVPolish
_last updated: 22 Nov 2026_

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
      2. #4 extract (keywords from profile) ......... RETIRED 2026-11-22
         (deleted with aiIntelligence — keywords are per-job now)
      3. #6 generate CV (THE product) + Option B .... DONE
      4. #12 translate to French .................... DONE
      5. #11 "Ask AI" (free-text CV edit) ........... DONE
- [x] Connect frontend to real API (swap fetch) ............. DONE
- [x] Keyword redesign (tiers/aliases, live scan, 503s)
      backend + API.md ................................ DONE
      frontend (steps 6-9) ........................... DONE
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
- 2026-11-21: UX clarity pass — you can now SEE whether AI ran: green
  "AI tailored this CV" banner vs red "No AI — profile copied as-is" on
  the workspace, green/red toasts everywhere, short emerald pulse around
  the CV when AI edits it. Home-card AI badge waits on one backend line
  (JobCard needs an aiUsed field). E2E re-run: 0 problems, your 2 CVs
  untouched.
- 2026-11-22: KEYWORD REDESIGN, backend half done (AI did steps 1-5 with
  my "you can do it"): aiIntelligence + GapAnalysis + the #4 extract
  endpoint are GONE. Jobs now store `keywords: [{term, aliases, tier}]`
  (model reads them from the JD; tiers = required/optional, aliases =
  alternate spellings). Matching is word-boundary now (git no longer
  matches github, C++/.net/Node.js still match). Cards compute
  score/required-missing at read from that list — nothing matched/missing
  is stored anymore. AI failures (create/translate/ask) now return a
  readable 503 instead of a fake fallback; translate cache still returns
  the saved copy for free. API.md rewritten to match. Verified with a
  62-check test suite (AI mocked). Frontend half next.
- 2026-11-22: KEYWORD REDESIGN, frontend half done (steps 6-9): types
  carry `keywords` (no more analysis/GapAnalysis/aiIntelligence anywhere),
  cv-text.ts got the word-boundary matcher twin (term + aliases, lookbehind
  guards), workspace scans live every edit — chips are green (have it) /
  red (required missing) / orange (nice-to-have, new section, never
  scored), clicking a chip highlights its aliases too. Profile page lost
  the AI-intelligence section (7 sections left, completeness out of 13).
  Translate cache-hit now toasts success (it always was one). tsc + build
  clean, E2E in a real browser: 0 console problems (3 real AI calls:
  create/translate/ask — all green).
- 2026-11-22: #6 PROMPT QUALITY FIX (AI pasted me an external report, I said
  "do the correct changes"). Verified every claim against the real prompt
  first, then: kept entries now keep ALL their bullets/technologies (no
  silent drops), figures are copied verbatim (no recomputed -40% → -30%),
  when my profile backs a JD keyword under another name the text uses the
  JD's exact wording (Express/FastAPI → "RESTful APIs", so chips go green
  honestly), special JD codes are woven in naturally (no "Mentioning
  ATLAS-FIN-26"), aliases may be common phrasings (rest api / api endpoints
  for RESTful APIs; GraphQL still not REST). Also: model replies wrapped in
  ```json fences are stripped now instead of faking a 503, and silently
  dropped unknown-id entries get logged. API.md #6 rules synced. 62/62
  suite green (made 5 count checks baseline-tolerant — my real test CV is
  still in the DB). Real-AI smoke passed: Gemini was briefly 503
  high-demand (their side, not the prompt), then a real create came back
  201 with aliases now including "REST APIs"/"API endpoints" and all
  bullets/stack intact.   Smoke CV deleted; my own CV untouched.
- 2026-11-22: #6 PROMPT V2 (I wrote it, AI applied it): keywords now scan
  the WHOLE JD - lowercase "kafka", skills I don't have, bonus items, no
  15-cap (24 terms on my JD). New `application_notes` (years, location,
  language, links/codes) comes back from the model but the code ignores
  it for now - schema + UI later. Figures copied verbatim; supported
  keywords' exact term must appear in the summary/bullets (RESTful APIs
  now green). Verified: 62/62, real create: Kafka = red gap, RESTful APIs
  = green, ATLAS-FIN-26 natural, test CV deleted.
- 2026-11-22: SKILLS TO THE AI (backend + frontend check + real test): the
  model now returns `skillGroups` too, so it can regroup/rename/order my
  skills for each JD. Guard checks the exact skill multiset — nothing
  dropped, invented or duplicated, otherwise 503 and no CV. 65/65 suite,
  container reloaded clean. Frontend already used `cv.skillGroups` (no
  code change), tsc clean. Real create on my Kafka JD: 26 keywords,
  Kafka red, RESTful APIs green, skills regrouped into 5 JD categories
  with all 23 intact, GET persists, test CV deleted.

## RIGHT NOW (the one thing)
**Keyword redesign is DONE** (backend + frontend + docs, 2026-11-22).
Next: **Polish + demo deploy** — loading states, error messages, dark
mode, then a deploy so this can go on my own CV with a live link.

## Next after that (in order)
1. Polish + deploy so I can put a live link on my own CV

## Golden rules (never break)
- Free AI only (Gemini free tier). No paid anything.
- AI is REQUIRED for AI features (create/translate/ask): no key / error /
  quota -> readable 503, NEVER a fake CV, NEVER a silent 200, NEVER a 500
- Naturally non-AI (scan, edit, save, print, translate cache) always work
- No new fallback features; translate cache = the one free reuse case
- I write backend code; AI builds only when I explicitly say "do it"
  (used 2026-11-22 for the redesign steps 1-5, then the #6 prompt fix)
- AI runs on explicit actions (buttons / creation), flash model, strict timeout
- Scan math (found/missing/score) stays pure code — AI only reads the JD

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
