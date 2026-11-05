# CVPolish API contract

The frontend is the source of truth for shapes: every type here matches
`frontend/lib/types.ts` 1:1 so the localStorage → fetch swap is mechanical.
This doc is the spec for building the FastAPI backend — one page at a time.

## Conventions
- Base path `/api`, JSON bodies only, ISO 8601 date strings
- No auth (personal tool, single user)
- All `id` strings are client-generated (`sg-*`, `exp-*`, `prj-*`, `edu-*`,
  `cert-*`, `job-*`) — the backend treats them as opaque and preserves them
- **AI endpoints never fail**: no key / quota / timeout → `200` with
  `aiUsed: false` + a non-AI fallback result. Never a 500. Core features
  must work with zero AI calls
- Languages: `lang` param is `"en" | "fr"` — two independent profile dbs

## Shared types (backend response/request payloads)

```ts
type Contact = {
  fullName: string; targetTitle: string; phone: string; email: string; city: string;
  github?: string; linkedin?: string; portfolio?: string;
};

type SkillGroup = { id: string; category: string; skills: string[] };

type Experience = {
  id: string; jobTitle: string; company: string; location: string;
  startDate: string;              // "Feb 2023" — plain text, backend stores as-is
  endDate: string | null;         // null = Present
  bullets: string[];              // may contain "" (renders as placeholder)
  technologies: string[];
};

type Project = {
  id: string; name: string; description: string; techStack: string[];
  links: { label: string; url: string }[];
  bullets: string[];
};

type Education = {
  id: string; degree: string; major?: string; university: string; location?: string;
  graduationYear: string; coursework?: string[];
};

type Certification = { id: string; name: string; issuer: string; year: string };

type AiIntelligence = {
  masterKeywords: string[];       // the AI-visible keyword dictionary (~15 max)
  baselineSummary: string;        // what the AI may use as base summary
  lastExtractedAt: string | null; // null = never extracted
};

type MasterProfile = {
  contact: Contact;
  summary: string;
  skillGroups: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];
  aiIntelligence: AiIntelligence;
  updatedAt: string;
};

type Language = "en" | "fr";
```

Storage hint: two tables max —
`profiles(lang PK, data JSONB)` and
`jobs(id PK, title, company, language, description, file_name, created_at, analysis JSONB, cv JSONB)`.

---

# Page 1 — Profile (`/profile`)

Master data editor. Four endpoints, one AI call, no AI required anywhere.

## `GET /api/profile/{lang}`

Called on `/profile` mount and after every language switch.

- Request body: none
- Unknown `lang` → `404 { "detail": "unknown language" }`
- **Never-saved profile → `200` with the empty structure below** (no seed
  data: the user's real data must never be confusable with demo data)

```json
{
  "contact": {
    "fullName": "", "targetTitle": "", "phone": "", "email": "",
    "city": "", "github": "", "linkedin": "", "portfolio": ""
  },
  "summary": "",
  "skillGroups": [],
  "experience": [],
  "projects": [],
  "education": [],
  "certifications": [],
  "aiIntelligence": { "masterKeywords": [], "baselineSummary": "", "lastExtractedAt": null },
  "updatedAt": "<ISO now>"
}
```

## `PUT /api/profile/{lang}`

Autosave, debounced 500 ms client-side. **Full replace** (one editor section
edits one deep slice; no partial-patch worth it at this scale).

- Request body: full `MasterProfile` (same shape as GET response)
- Response `200`: stored `MasterProfile` with fresh `updatedAt`
- `422 { "detail": "..." }` on malformed body; `404` on unknown `lang`

## `DELETE /api/profile/{lang}`

"Reset data" button (client confirms before calling). True fresh start:

- Request body: none
- Response `200`: the **empty `MasterProfile`** (identical to never-saved GET)
- The empty object must never be confused with seeded demo data

## `POST /api/profile/{lang}/extract-intelligence`

"Save & extract" button — the only AI call on this page, always explicit.

- Request body: none (server reads the stored profile itself)
- Response `200` (AI path): `{ "aiUsed": true, "data": AiIntelligence }`
- Response `200` (fallback, ≤ ~10 s): `{ "aiUsed": false, "data": AiIntelligence }`
  where the fallback derives keywords locally from `skillGroups.skills`,
  `experience[].technologies`, `projects[].techStack` (max ~15) and builds the
  baseline summary template-style
- The backend merges `data` into the stored profile's `aiIntelligence`
  (+ fresh `updatedAt`); the client replaces its `aiIntelligence` block
- Client behavior on `aiUsed: false`: show the result, never block, never 500

---

# Page 2 — Home (`/`) + job creation (`/jobs/new`)

Cards must stay light: the list endpoint ships **no CV payloads**.

## `GET /api/jobs`

Called on home mount. Newest first (`createdAt` desc).

- Request body: none
- Response `200`: `JobCard[]` — possibly empty (`[]`)

```ts
type JobCard = {
  id: string;
  title: string;               // what the user navigates by
  company: string;             // may be ""
  location?: string;
  language: Language;          // drives the EN/FR badge
  createdAt: string;
  score: number | null;        // null when analysis was never run
  matchedCount: number;        // analysis.matched.length (0 if no analysis)
  missingCount: number;        // analysis.missing.length (0 if no analysis)
  fileName?: string;           // renamed filename, if any
};
```

No `cv`, no `description`, no `analysis` object in the list — those live in
`GET /api/jobs/{id}` (workspace page, next section).

## `POST /api/jobs`

Create + analyze in a single call (matches `/jobs/new`: paste JD → Analyze).

**Request body:**
```json
{ "language": "en", "description": "<full pasted job posting>" }
```
- `language` must be `"en" | "fr"` → else `404`
- `description` must be non-empty after trim (cap ~50k chars) → else `422`

**What the backend does, in order:**
1. **Freeze the CV** — copy the current `profiles[language]` into the new
   job's `cv` (frozen at creation; later profile edits never touch it,
   and AI/inline edits go into this copy only)
2. **Detect the title** — first non-empty line of `description`,
   leading `#`/markdown stripped, capped at 80 chars (AI detection later)
3. **Analyze** — compare the JD text against the frozen `cv.aiIntelligence.masterKeywords`:
   - `matched` = master keywords present in the JD text (case-insensitive)
   - `missing` = keywords the job requires that the user lacks (AI-assisted
     when available; heuristic/template otherwise)
   - `notes = {}` empty map, `added = []`
   - `score = round(matched / (matched + missing) * 100)` (0 if none)
4. `createdAt = now`, `fileName` unset (the client computes the default
   `Name - Position - LANG.pdf`; rename arrives via PATCH)

**Response `201`:** the **full `Job`** — same shape the workspace expects:
```ts
type Job = {
  id: string;
  language: Language;
  title: string;
  company: string;             // "" until detected later
  location?: string;
  description: string;         // raw pasted JD, stored verbatim
  createdAt: string;
  cv: MasterProfile;           // frozen at creation
  fileName?: string;
  analysis: GapAnalysis | null;
  rewrites: [];                // legacy field, always empty, kept for compat
  tailored: null;              // legacy field, always null, kept for compat
};

type GapAnalysis = {
  score: number;
  matched: string[];
  missing: string[];
  notes: Record<string, string>;
  added: string[];
};
```

**Works with zero AI calls**: matching falls back to plain substring analysis.

**Note — no job status:** there is no `status` field anywhere ("draft /
analyzed / tailed" was dropped — it never reflected real state). Jobs live
in language only; the card keeps the EN/FR badge. Legacy clients/saved
payloads that still carry a `status` string: the backend must ignore it
silently on input and never return it.

## Notes
- The profile **completeness nudge** on home uses `GET /api/profile/{lang}`
  (page 1) — no extra endpoint
- There is no delete on home today; when wanted later:
  `DELETE /api/jobs/{id}` → `204`

---

# Page 3 — Job workspace (`/jobs/{id}`)

The job owns its own saved CV (`cv`: starts as the creation-time copy of the
profile, then absorbs AI results and every manual edit). Nothing here ever
writes to `profiles`.

## `GET /api/jobs/{id}`

Called on workspace mount.

- Request body: none
- Response `200`: full `Job` (same type as `POST /api/jobs` — with `cv`,
  `description`, `analysis`, the works)
- Unknown id → `404 { "detail": "job not found" }`

## `POST /api/jobs/{id}/analyze`

"Analyze match" button (shown when `analysis` is `null` — e.g. legacy jobs).
Recomputes the gap analysis against the job's **current frozen `cv`** and
stores it back on the job. No body, no SQL — pure comparison, zero AI needed
for the core path (same rules as `POST /api/jobs` step 3).

- Request body: none
- Response `200`: `{ "analysis": GapAnalysis }` — client merges that field
  into its local job; backend persists it on the job row

## `PATCH /api/jobs/{id}`

Top-bar edits only: rename the job title (popover) and rename the PDF file
(FileChip). Partial body — send only what changed.

**Request body:**
```json
{ "title": "Senior Dev — Targeted CV", "fileName": "Nizar - Senior Dev - EN.pdf" }
```

- Response `200`: full `Job` (client may already know the value; ignore the
  response or use it to reconcile)
- Unknown id → `404`; empty/whitespace value for a provided field → `422`

## `PUT /api/jobs/{id}/cv`

**The saved-CV autosave.** Fires debounced (500 ms) after every inline edit,
quick-add ("+ this category chip"), bullet add/delete, and after the AI merge.
The client sends the whole edited `MasterProfile` — full replace, same
semantics as `PUT /api/profile/{lang}`.

- Request body: full `MasterProfile` (the job's `cv`)
- Response `200`: stored `MasterProfile` (fresh `updatedAt`) — client ignores
- This must **never** touch `profiles[lang]` — the job's copy is its own document

## `POST /api/jobs/{id}/integrate-missing`

"Ask AI" — the workspace's single AI call, always explicit. Weaves the
missing keywords into the CV per the user's per-keyword prompts.

**Request body:**
```json
{
  "keywords": ["GraphQL", "Kubernetes"],
  "prompts": [
    "Mention where and how each keyword is used, tied to real experience or projects"
  ],
  "language": "en"
}
```
- `keywords`: the currently-missing keywords (client-computed live scan)
- `prompts`: one string per keyword, the user's instruction for it
- `language`: convenience echo of the job language (server can ignore it)

**What the backend does:** generates targeted bullets per keyword against the
job's frozen `cv` **in memory**, merges them into `experience`/`projects`
(`masterKeywords` that are now present behave like any cv text), stores the
new `cv` on the job, and returns it.

**Response `200` (AI path):**
```json
{ "aiUsed": true, "cv": MasterProfile }
```

**Response `200` (fallback — no key / quota / timeout, ≤ ~15 s):**
```json
{ "aiUsed": false, "cv": MasterProfile }
```
with the `cv` **unchanged** — the client keeps its old state and shows an
advisory toast ("AI unavailable — weave it in manually"), never a 500.

Timeout target: seconds (small/flash model). The client already shows a
spinner for the duration.

## What needs no endpoint (frontend-only)

| Feature | Why local |
|---|---|
| Live scan (green flips, re-score) | `cvText(cv)` substring check + counts |
| Word-level highlight / navigate | CSS Highlight API on the rendered CV |
| Quick add chip | one skill edit → goes through `PUT .../cv` |
| Print / Save as PDF | `window.print()`, filename via `document.title` |
| `notes`/"add anyway" map | superseded — a keyword is missing until its text is on the CV |
| `rewrites` / `tailored` job fields | legacy, UI removed; still stored for compat |

---

## Recap — full endpoint surface

| # | Method | Path | AI? |
|---|--------|------|-----|
| 1 | GET | `/api/profile/{lang}` | no |
| 2 | PUT | `/api/profile/{lang}` | no |
| 3 | DELETE | `/api/profile/{lang}` | no |
| 4 | POST | `/api/profile/{lang}/extract-intelligence` | yes (fallback local) |
| 5 | GET | `/api/jobs` | no |
| 6 | POST | `/api/jobs` | optional (title detect / missing detect) |
| 7 | GET | `/api/jobs/{id}` | no |
| 8 | POST | `/api/jobs/{id}/analyze` | no |
| 9 | PATCH | `/api/jobs/{id}` | no |
| 10 | PUT | `/api/jobs/{id}/cv` | no |
| 11 | POST | `/api/jobs/{id}/integrate-missing` | yes (fallback no-op) |

Ten of eleven work with zero AI — the app never requires a model to function.
- Client behavior on `aiUsed: false`: show the result, never block, never 500
