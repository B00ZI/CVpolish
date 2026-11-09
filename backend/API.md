# CVPolish — Backend build guide (API)

This is the contract between the frontend (already built, mock-phase) and the
backend you are going to build. Shapes match `frontend/lib/types.ts` 1:1, so
the swap from mock data to real fetches is mechanical.

Build it in this order: **Profile first, then Jobs, then the AI wiring.**
Eleven endpoints — read the table at the end. Three of them have an AI
branch (#4 extract-intelligence, #6 POST /api/jobs, #11 integrate-missing);
every one has a working no-AI fallback, so nine of eleven *run* without a key.

---

## 1. The mental model — data lives in ONE place: the database

The frontend is just views. It holds no second copy of the truth:

- The **DB** (Postgres) is the only source of truth for profiles and jobs.
- The frontend **reads on mount** (`GET`) and **writes on action** (`PUT`/`POST`).
- There is no polling, no websockets, no sync. Single user, so **last write
  wins** — no conflict handling needed.
- React state is a working mirror of what you just read/wrote. On every edit
  the UI updates its state instantly (so typing feels live) and persists
  in the background.

### What localStorage is today, and what happens to it

Right now the "database" is fake: `localStorage` stores profiles and jobs
(keys `cvpolish.profile.v1`, `cvpolish.profile.fr.v1`, `cvpolish.jobs.v1`).
That exists only because there was no backend yet — so the UI could still
save edits across reloads.

**After the swap, localStorage is not needed at all for app data.** The
browser's localStorage is deleted on "Clear site data", shared across
incognito tabs badly, and can't be reached from the DB — so the real backend
replaces it completely:

| Stored in localStorage today | Becomes with the backend |
|---|---|
| `cvpolish.profile.v1` (EN profile) | DB row `profiles(en)` via `GET/PUT` |
| `cvpolish.profile.fr.v1` (FR profile) | DB row `profiles(fr)` |
| `cvpolish.jobs.v1` (all saved jobs) | DB rows in `jobs` via the job endpoints |
| `aiIntelligence` migration flags | DB column inside the profile JSON |
| `cvpolish.theme` (dark/light) | **stays** — UI preference, not app data, no backend wanted |

So: you need no "sync" endpoint, no export/import. The frontend will simply
fetch on load instead of reading localStorage.

### The three write patterns (only these, nothing fancier)

1. **Debounced full-replace autosave.** Typing/editing fires `PUT` with the
   whole document 500 ms after the last keystroke. Why full replace?
   One editor section edits one deep slice of the data; per-field patching
   is opinionated and not worth it for a personal tool. Why debounce?
   It turns hundreds of keystrokes into ~one request per edit burst.
2. **Explicit user action → one request.** Buttons like "Reset", "Save &
   extract", "Analyze" call the endpoint once, the response replaces state.
3. **AI action → request that both mutates and returns.** The AI endpoints
   change the saved data server-side and give the result back; the client
   drops its local copy and adopts the response (no optimistic guesswork).

---

## 2. User journey flows — what actually happens

### A. Profile page `/profile`
1. User opens `/profile` with language `en` → `GET /api/profile/en` → first
   time ever this returns an **empty structure** (no seed data) → UI shows
   8 empty editable sections
2. User types → React state updates live → after 500 ms idle →
   `PUT /api/profile/en` (whole `MasterProfile`)
3. Switch language to `fr` (UI flushes pending edits first, then) →
   `GET /api/profile/fr` → an independent FR profile
4. "Save & extract" → `POST /api/profile/en/extract-intelligence` →
   keywords + baseline summary saved by the server → result renders
5. "Reset data" (confirm) → `DELETE /api/profile/fr` → empty structure back

> Home's completeness bar is computed in the browser from this same profile —
> it needs no extra endpoint.

### B. New CV `/jobs/new` — the one place the CV is BORN
1. User picks language (EN/FR cards), pastes the full job description
2. "Generate" → `POST /api/jobs` `{language, description}` → backend (AI path):
   - **generates the tailored CV**: contact, education, certifications are
     copied verbatim from `profiles[language]`; summary, experience and
     projects are AI-rewritten for THIS JD (reuse the real entries — drop
     irrelevant ones, order by relevance, clean bullets — never invent)
   - **analyzes the generated CV** against the JD (Keyword scan contract,
     section 4b): matched / missing / score
   - saves the job (row includes `ai_used`) and returns it **complete**:
     full CV + analysis in one response
   - without AI (no key / quota / timeout): fallback = frozen profile copy +
     local analysis, `aiUsed: false` — same response shape
3. Frontend takes the returned `id` and navigates to `/jobs/{id}`

### C. Workspace `/jobs/{id}` — view, edit, print
1. Mount → `GET /api/jobs/{id}` → everything needed renders: left panel =
   analysis + missing keywords, right = the live A4 CV (`job.cv`)
2. Green/amber flips and the score: 100% frontend. The text of the CV is
   scanned locally for the keywords — **no backend involvement on edits**
3. Quick-add a chip / add a bullet / rename title or filename →
   `PATCH /api/jobs/{id}` (title/filename) or `PUT /api/jobs/{id}/cv`
   (any CV edit, debounced)
4. "Ask AI" (explicit button): `POST /api/jobs/{id}/integrate-missing`
   sends the missing keywords + the user's per-keyword instructions →
   the server weaves them into bullets of `job.cv`, **saves it** and returns
   the updated CV → client adopts it
5. Print: browser only (`window.print()`, filename via `document.title`)
   → **no endpoint at all**

### D. Home `/`
1. Mount → `GET /api/jobs` → light card list (no CV payloads)
2. Card → `/jobs/{id}` → `GET /api/jobs/{id}` (C above)

---

## 3. Conventions (read before coding)

- Base path `/api`. JSON bodies only. ISO 8601 datetimes.
- **No auth.** Personal tool, one user, the only consumer is the frontend
  at `http://localhost:3000` (CORS is already configured in `main.py`).
- **Languages** `lang` = `"en" | "fr"` — two fully independent profiles.
- **Ids are client-generated** (`job-*`, `sg-*`, `exp-*`, `prj-*`, `edu-*`,
  `cert-*`). The backend treats them as opaque strings. Why? The UI needs the
  id the moment it creates a row (to scroll/highlight/target it), so waiting
  for the server to mint one would add latency for no gain.
- **`updatedAt` is informational.** The client already holds correct state
  after a write; it stores but never reads the server's timestamps.
- **Errors must be plain.** `{ "detail": "..." }` in the body (already the
  FastAPI default). The UI surfaces them as a toast and keeps its local
  state — a failed save quietly retries on the next edit.
- **AI endpoints never fail** — hard rule of this project:
  no API key / quota exhausted / slow model → still `200`, with
  `aiUsed: false` and a **useful non-AI result** (or an unchanged result for
  integrate-missing). Never a 500. Ten of ten endpoints must work with the
  key missing.

---

## 4. Shared types

```ts
type Language = "en" | "fr";

type Contact = {
  fullName: string; targetTitle: string; phone: string; email: string; city: string;
  github?: string; linkedin?: string; portfolio?: string;
};

type SkillGroup = { id: string; category: string; skills: string[] };

type Experience = {
  id: string; jobTitle: string; company: string; location: string;
  startDate: string;               // "Feb 2023" — plain text, stored as-is
  endDate: string | null;          // null = Present
  bullets: string[];               // may contain "" → UI shows a placeholder
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
  masterKeywords: string[];        // the keyword dictionary matching runs on (~15 max)
  baselineSummary: string;         // what the AI may reuse as a summary base
  lastExtractedAt: string | null;  // null = never extracted → UI shows "—"
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

type GapAnalysis = {
  score: number;                   // round(matched / (matched + missing) * 100)
  matched: string[];               // keywords you already have
  missing: string[];               // keywords the job wants that you lack
  notes: Record<string, string>;   // legacy, always {}; UI no longer writes it
  added: string[];                 // legacy, always []; UI no longer writes it
};

type Job = {
  id: string;
  language: Language;
  title: string;                   // detected from the JD first line
  company: string;                 // "" until detected later
  location?: string;
  description: string;             // raw pasted JD, stored verbatim
  createdAt: string;
  cv: MasterProfile;               // the job's CV (generated, or frozen copy on fallback)
  fileName?: string;               // renamed PDF filename, else client default
  analysis: GapAnalysis;           // ALWAYS set — creation analyzes once
  aiUsed: boolean;                 // true = AI generated/edited this CV; false = fallback
  // legacy, only for old browser data — the API may omit both:
  rewrites: [];                    // always []
  tailored: null;                  // always null
};
```

DB hint — two tables, that's it:

```
profiles (lang PK,   data JSONB, updated_at)
jobs     (id PK,  title, company, language, description,
          file_name nullable, created_at, analysis JSONB, cv JSONB,
          ai_used Boolean NOT NULL default False)
```

No `status` column — the old draft/analyzed/tailed pipeline was dropped
(it never reflected real state; the UI keeps only the EN/FR badge).
If an old client still sends `status`, ignore it silently, never return it.

Handle editable `bullets: [""]` — never "clean" empty strings server-side;
the UI renders them as click-to-edit placeholders.

---

## 4b. Keyword scan contract — ONE rule, implemented on BOTH sides

This is the consistency guarantee of the whole app. The frontend lives in
`lib/cv-text.ts` (`cvText()` scan + `analyzeForJob()`), the backend creation
analysis in `analyze_for_job()` — both must produce the SAME numbers for the
same CV + JD. So this block is the specification both sides copy from — if it
ever changes, change both sides in the same commit.

**Rule 1 — the text to scan** (`cv_text`): concatenate exactly these fields
into one string, lowercased (`"React"` → `"react"`). Nothing else.

```
contact.fullName + contact.targetTitle + summary
for each experience : jobTitle + company + location + technologies + bullets
for each project    : name + techStack + description + bullets
for each skillGroup : skills
for each education  : degree + major + university + location
for each certification : name + issuer
```

(Practical detail: the original frontend scan did NOT include
`experience[].technologies`; it now does, per the 2026-11-09 decision —
a tech listed under a job's technologies counts as "on the CV".)

**Rule 2 — the keyword universe** is `aiIntelligence.masterKeywords`
(~15, extracted on the profile page). Words outside this list never appear
in matched/missing, no matter how often the JD repeats them.

**Rule 3 — required** = the master keywords that appear in the JD text
(case-insensitive substring). A keyword the JD never mentions can't be
required, so it's neither matched nor missing.

**Rule 4 — matched vs missing** (against `cv_text`, Rule 1):

- `matched`  = required keyword whose lowercase text appears in `cv_text`
- `missing`  = required keyword that does NOT appear in `cv_text`
- `score`    = `round(matched / (matched + missing) * 100)`, `0` when both are empty

**Rule 5 — the frontend live scan re-checks only `matched ∪ missing`** (the
required set) against the CV as the user edits it. It may flip a green chip
red again — but it can never invent a chip the backend didn't report, because
both sides scan the same text with the same rule.

> Why substring, not word-boundary? Deliberate trade-off for a personal tool:
> "git" matching inside "github" is acceptable noise; a regex word scan adds
> complexity for no real gain. If it ever bothers you, fix it HERE and in the
> frontend in one commit — nowhere else.

---

## 4c. Example payload — for testing in `/docs`

The `/docs` "Try it out" shows field names but never *what goes inside*
(`skillGroups`? `links`?). Below is one complete `MasterProfile` with
realistic values — use it directly as the body for
`PUT /api/profile/{lang}`, then `POST .../extract-intelligence` and the other
calls have real data to chew on. Same values as the frontend mock
(`frontend/mock/profile.ts`), so demo screens and manual tests agree.

```json
{
  "contact": {
    "fullName": "Karim Alaoui",
    "targetTitle": "Full-Stack Developer",
    "phone": "+212 6 12 34 56 78",
    "email": "karim.alaoui.dev@proton.me",
    "city": "Casablanca, Morocco",
    "github": "github.com/karim-alaoui",
    "linkedin": "linkedin.com/in/karim-alaoui",
    "portfolio": "karimalaoui.dev"
  },
  "summary": "Full-stack developer with 3 years of experience shipping web apps with React, TypeScript, and Node.js. I turn rough product ideas into fast, maintainable features — most recently cutting API response times by 40% and halving deploy times with a GitHub Actions pipeline.",
  "skillGroups": [
    { "id": "sg-langs",      "category": "Languages",              "skills": ["TypeScript", "JavaScript", "Python", "SQL", "HTML5 / CSS3"] },
    { "id": "sg-frameworks", "category": "Frameworks & Libraries", "skills": ["React", "Next.js", "Node.js", "Express", "FastAPI", "Tailwind CSS"] },
    { "id": "sg-databases",  "category": "Databases",              "skills": ["PostgreSQL", "MongoDB", "Redis"] },
    { "id": "sg-cloud",      "category": "Cloud & DevOps",         "skills": ["Docker", "GitHub Actions", "CI/CD", "AWS (EC2, S3)", "Linux"] },
    { "id": "sg-tools",      "category": "Tools",                  "skills": ["Git", "Postman", "Figma", "Jira"] }
  ],
  "experience": [
    {
      "id": "exp-atlas",
      "jobTitle": "Full-Stack Developer",
      "company": "Atlas Digital",
      "location": "Casablanca, Morocco",
      "startDate": "Feb 2023",
      "endDate": null,
      "bullets": [
        "Optimized SQL queries and added Redis caching, cutting average API response time from 900 ms to 540 ms (−40%)",
        "Built a CI/CD pipeline with GitHub Actions and Docker, halving deployment time from 25 to 12 minutes",
        "Shipped a customer dashboard used by 1,200+ monthly users, raising task completion rate by 28%"
      ],
      "technologies": ["React", "TypeScript", "Node.js", "PostgreSQL", "Redis", "Docker", "GitHub Actions"]
    },
    {
      "id": "exp-greentech",
      "jobTitle": "Frontend Developer Intern",
      "company": "GreenTech Solutions",
      "location": "Rabat, Morocco",
      "startDate": "Jun 2022",
      "endDate": "Sep 2022",
      "bullets": [
        "Rebuilt 12 legacy jQuery pages in React, improving Lighthouse performance from 54 to 91",
        "Integrated Stripe checkout that processed the first 500 paid orders within 3 months"
      ],
      "technologies": ["React", "TypeScript", "Stripe"]
    }
  ],
  "projects": [
    {
      "id": "prj-shipment",
      "name": "ShipmentTrack",
      "description": "Real-time shipment dashboard for small carriers: live map, delay alerts, and report exports.",
      "techStack": ["Next.js", "TypeScript", "PostgreSQL", "Socket.IO", "Docker"],
      "links": [
        { "label": "Live", "url": "https://shipmenttrack.app" },
        { "label": "GitHub", "url": "https://github.com/karim-alaoui/shipmenttrack" }
      ],
      "bullets": [
        "Streams 5,000+ shipment events per day over WebSockets with live map updates",
        "Cut initial page load to 1.2 s with route-level code splitting and image optimization"
      ]
    },
    {
      "id": "prj-devradar",
      "name": "DevRadar",
      "description": "Weekly repo-health digest emailed to engineering teams: open PRs, review latency, commit churn.",
      "techStack": ["Python", "FastAPI", "PostgreSQL", "GitHub API"],
      "links": [
        { "label": "GitHub", "url": "https://github.com/karim-alaoui/devradar" }
      ],
      "bullets": [
        "Runs scheduled GitHub API jobs for 40+ repositories with a 99.5% on-time delivery rate",
        "JWT auth with refresh-token rotation protects private team dashboards"
      ]
    }
  ],
  "education": [
    {
      "id": "edu-h2",
      "degree": "BSc Computer Science",
      "major": "Software Engineering",
      "university": "Hassan II University",
      "location": "Casablanca, Morocco",
      "graduationYear": "2023",
      "coursework": ["Data Structures & Algorithms", "Databases", "Operating Systems"]
    }
  ],
  "certifications": [
    { "id": "cert-aws", "name": "AWS Certified Cloud Practitioner", "issuer": "Amazon Web Services", "year": "2024" }
  ],
  "aiIntelligence": {
    "masterKeywords": ["React", "TypeScript", "Next.js", "Node.js", "PostgreSQL", "Docker", "CI/CD", "Tailwind CSS", "FastAPI", "Redis", "Git", "Agile"],
    "baselineSummary": "Full-Stack Developer with 3 years of experience across React, TypeScript, Node.js, and PostgreSQL — ships fast, maintainable features end to end.",
    "lastExtractedAt": "2026-10-29T10:00:00.000Z"
  },
  "updatedAt": "2026-10-29T10:00:00.000Z"
}
```

Test checklist with it:
1. `PUT /api/profile/en` with the JSON above → `200`, response shows a fresh `updatedAt`
2. `GET /api/profile/en` → same profile back
3. `POST /api/jobs` with the JD example below — **do this BEFORE step 4**:
   the scan universe is the `masterKeywords` array saved in the payload above
   (incl. `Agile`), and extract-intelligence would replace it with its own
   locally derived list
4. `POST /api/profile/en/extract-intelligence` → `{ "aiUsed": false, "data": { "masterKeywords": [...], "baselineSummary": "...", "lastExtractedAt": ... } }` — a later `GET` shows this merged into the profile's `aiIntelligence`
5. `DELETE /api/profile/en` → `200` with the empty structure; `GET` → empty again

### Example JD — for testing `POST /api/jobs` right after step 4

Re-save the profile first (steps 1–4), then paste this as the JD body
of `POST /api/jobs` with `{"language": "en", ...}`:

```
Frontend Developer at Northwind Labs — Remote

We build logistics software used by 200+ carriers. We are looking for a
frontend developer who ships fast, clean UIs.

Requirements:
- 3+ years of experience with React and TypeScript
- Solid grasp of Next.js and Tailwind CSS
- Comfortable with Git-based workflows and code review
- Agile team, daily standups, sprint planning
```

Expected result with the **fallback** (frozen copy of the example profile,
local scan): required = {react, typescript, next.js, tailwind css, git,
agile} → `matched = ["React", "TypeScript", "Next.js", "Tailwind CSS",
"Git"]` (5), `missing = ["Agile"]` (the profile text never mentions it),
`score = 83`, `aiUsed = false`. Verify the same by hand once — that check
is what proves your `cv_text()` mirrors the frontend contract (section 4b).

---

## 5. Endpoints, page by page

### Page 1 — Profile (`/profile`)

#### `GET /api/profile/{lang}`
- **Where/why:** `/profile` mount + every language switch.
- Request body: none.
- Unknown `lang` → `404`.
- **Never-saved profile → `200` with the empty structure below.** Deliberate:
  no seed/demo data, so real saved data can never be confused with samples.
  The empty structure is also exactly what `DELETE` returns.

```json
{
  "contact": { "fullName": "", "targetTitle": "", "phone": "", "email": "",
               "city": "", "github": "", "linkedin": "", "portfolio": "" },
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

#### `PUT /api/profile/{lang}`
- **Where/why:** debounced autosave of every edit on `/profile`.
- Request body: full `MasterProfile` (same shape as above response).
- Response `200`: stored `MasterProfile` with fresh `updatedAt`.
- Full replace — replace the entire JSON, nothing merged.
- `422` malformed body; `404` unknown lang.

#### `DELETE /api/profile/{lang}`
- **Where/why:** the "Reset data" button (client confirms first).
- Response `200`: the same empty `MasterProfile` as a first-time GET.
  (Not 204 — the client adopts the returned object as its new state.)

#### `POST /api/profile/{lang}/extract-intelligence`  ⚡ AI
- **Where/why:** the explicit "Save & extract" button. The only AI call on
  this page. Server reads the stored profile itself — no body to send.
- Response `200` (AI path): `{ "aiUsed": true, "data": AiIntelligence }`
- Response `200` (fallback, ≤ ~10 s): `{ "aiUsed": false, "data": AiIntelligence }`
  where the fallback derives keywords locally from `skillGroups.skills` +
  `experience[].technologies` + `projects[].techStack` (max ~15) and builds a
  template baseline summary. **Never 500.**
- Server merges `data` into the stored profile (`aiIntelligence` + new
  `updatedAt`); the client replaces its `aiIntelligence` block.
- Why this exists: `masterKeywords` is the dictionary every job analysis runs
  on (the universe of Keyword scan contract section 4b), and
  `baselineSummary` is the seed text the POST /api/jobs generation prompt may
  start a rewritten summary from. Extract it once; creation and the
  integrate-missing AI depend on it.

### Page 2 — Home (`/`) + New CV (`/jobs/new`)

#### `GET /api/jobs`
- **Where/why:** home mount — the saved-CV cards.
- Request body: none.
- Response `200`: `JobCard[]`, newest first, `[]` when none. **No CV
  payloads** — the list must stay light:

```ts
type JobCard = {
  id: string;
  title: string;               // what the user navigates by
  company: string;             // may be ""
  location?: string;
  language: Language;          // drives the EN/FR badge
  createdAt: string;
  score: number;               // analysis.score
  matchedCount: number;        // analysis.matched.length
  missingCount: number;        // analysis.missing.length
  fileName?: string;
};
```

#### `POST /api/jobs`  ⚡ AI (fallback: no-AI result, same shape)
- **Where/why:** "Generate" on `/jobs/new` — the CV is born here.
- Request body: `{ "language": "en", "description": "<full pasted JD>" }`
  (unknown `language` → `422`; `description` empty after trim → `422`,
  cap ~50k chars).
- **AI path** (key present, seconds — strict timeout, small/flash model):
  1. Load `profiles[language]` → `404` if not saved yet (frontend gates on
     it, but enforce it)
  2. **Generate the tailored CV** from profile + JD:
     - copied verbatim, untouched: `contact`, `education`,
       `certifications` (and `aiIntelligence`)
     - AI-rewritten: `summary`, `experience`, `projects` — with hard rules:
       reuse ONLY real entries from the profile (drop irrelevant ones),
       order by relevance to the JD, rewrite bullets to satisfy the JD
       where the profile's facts support it, keep every number/claim real
       (= taken from the profile), **never invent** employers, projects,
       numbers or skills — if a JD keyword has no factual base, it stays
       out (it then shows up as a missing chip, which is the app's point)
     - new entry ids: mint `exp-*` / `prj-*` (idiom of the app)
  3. **Analyze** the generated CV per the Keyword scan contract (section 4b),
     through the same `cv_text()` + `analyze_for_job()` helpers the
     fallback uses — never the model's opinion without a substring check
  4. Read the title from the first non-empty JD line (strip `#`/markdown,
     cap 80 chars); `createdAt = now`, `fileName` unset
  5. Insert the row with `ai_used = true`, return the full `Job`
- **Fallback path** (no key / quota / timeout / unusable model output,
  ≤ ~10 s): same steps, except step 2 freezes the profile copy as-is
  (`job.cv` = stored profile verbatim) and `ai_used = false`. Analysis is
  the identical local scan. **Never a 500** — this endpoint is one of the
  paths where AI-off must feel like a working feature, not an error.
- Response `201`: the full `Job` (types in section 4; `aiUsed` says which
  path ran — the client shows a matching toast and adopts the CV either way).

#### `DELETE /api/jobs/{id}`
- **Where/why:** the trash icon on a home card, after the user confirms in
  the UI dialog. Deletes the whole job row — its `cv` and `analysis` live in
  the row, so nothing else to clean up.
- Request body: none.
- Response: `204 No Content` (the client drops the card from its list).
- Unknown id → `404`. Idempotent: deleting an already-deleted id is also
  `404` — the UI never repeats the call anyway.

### Page 3 — Workspace (`/jobs/{id}`)

#### `GET /api/jobs/{id}`
- **Where/why:** workspace mount — the whole screen renders from it.
- Response `200`: full `Job` (incl. `cv`, `description`, `analysis`).
  Unknown id → `404 { "detail": "job not found" }`.
- The **analysis always exists** — POST /api/jobs sets it at creation.
  There is no "no analysis yet" state and no separate analyze endpoint.

#### `PATCH /api/jobs/{id}`
- **Where/why:** top-bar renames only — the title popover and the PDF
  filename chip. Partial body, only what changed:
  `{ "title": "...", "fileName": "Nizar - Senior Dev - EN.pdf" }`
- Response `200`: full `Job` (client may ignore and keep its local value).
- Unknown id → `404`; whitespace-only provided field → `422`.

#### `PUT /api/jobs/{id}/cv`
- **Where/why:** the saved-CV autosave. Fires debounced 500 ms after every
  inline edit on the A4 CV, plus quick-adds and added/deleted bullets.
- Request body: the whole edited `MasterProfile` — full replace.
- Response `200`: stored `MasterProfile`.
- **Must never touch `profiles[lang]`.** The job's `cv` is its own document;
  this is what makes tailoring per-job possible at all.

#### `POST /api/jobs/{id}/integrate-missing`  ⚡ AI
- **Where/why:** "Ask AI" under the missing-keyword chips — the workspace's
  only AI call, always explicit.
- Request body:
```json
{
  "keywords": ["GraphQL", "Kubernetes"],
  "prompts": [
    "Say where each keyword is used and how, tied to real experience/projects"
  ],
  "language": "en"
}
```
  (`keywords` = the currently-missing ones; `prompts` = one string per
  keyword, the user's instruction; `language` is a convenience echo of the
  job language — server can ignore it.)
- What the server does: with a flash model, weave each keyword into
  `experience`/`projects` bullets of the job's `cv`, honoring the prompt;
  save the new `cv` on the job; seconds, not minutes — use a small/free
  model and a strict timeout.
- Response `200` (AI path): `{ "aiUsed": true, "cv": MasterProfile }`
- Response `200` (fallback — no key / quota / timeout, ≤ ~15 s):
  `{ "aiUsed": false, "cv": MasterProfile }` with the cv **unchanged**, and
  the client shows an advisory toast ("AI unavailable — edit manually").
  **Never 500.**

#### Frontend-only features — build NO endpoints for these
| Feature | Why it needs no backend |
|---|---|
| Live keyword scan (green flips, live score) | local text search over `cv` |
| Keyword click → highlight / scroll in the CV | DOM/CSS, already built |
| Room quick-add | one skill edit → rides on `PUT .../cv` |
| Print / Save as PDF | `window.print()`; filename via `document.title` |
| Completeness %, home cards dots | computed in the browser |

---

## 6. Swap map — what replaces what in the frontend code

| Today (mock) | Becomes | File |
|---|---|---|
| read/write localStorage profile | `GET/PUT /api/profile/{lang}` | `lib/profile-store.ts` |
| read/write localStorage jobs | `GET /api/jobs`, `GET/PATCH/PUT` on `/api/jobs/{id}...` | `lib/jobs-store.ts` |
| `mockAnalyze()` | `POST /api/jobs` (created with response) | `mock/generate.ts` |
| `mockExtractIntelligence()` | `POST /api/profile/{lang}/extract-intelligence` | `mock/generate.ts` |
| `mockAutoFit()` | `POST /api/jobs/{id}/integrate-missing` | `mock/generate.ts` |
| `withDelay()` fake spinners | delete — real network latency | `mock/index.ts` |
| language picker state | drives `GET /api/profile/{lang}` | per page |

Expected runtime behavior after the swap: same screens, same states, same
spinners — only the storage behind them changes.

---

## 7. Overview table + build order (suggested)

| # | Method | Path | AI? | Page |
|---|--------|------|-----|------|
| 1 | GET | `/api/profile/{lang}` | no | Profile |
| 2 | PUT | `/api/profile/{lang}` | no | Profile |
| 3 | DELETE | `/api/profile/{lang}` | no | Profile |
| 4 | POST | `/api/profile/{lang}/extract-intelligence` | **yes** (fallback local) | Profile |
| 5 | GET | `/api/jobs` | no | Home |
| 6 | POST | `/api/jobs` | **yes** (fallback: freeze + local scan) | New CV |
| 7 | GET | `/api/jobs/{id}` | no | Workspace |
| 8 | PATCH | `/api/jobs/{id}` | no | Workspace |
| 9 | PUT | `/api/jobs/{id}/cv` | no | Workspace |
| 10 | DELETE | `/api/jobs/{id}` | no | Home |
| 11 | POST | `/api/jobs/{id}/integrate-missing` | **yes** (fallback no-op) | Workspace |

1. `profiles` table + `GET`/`PUT /api/profile/{lang}` — no AI, easier to test
   straight in the browser
2. `jobs` table + `GET /api/jobs` + `POST /api/jobs` (fallback path first,
   AI in its branch later) + `GET /api/jobs/{id}`
3. `PATCH /api/jobs/{id}` + `PUT /api/jobs/{id}/cv` (autosave lives here)
4. `DELETE /api/profile/{lang}` + `DELETE /api/jobs/{id}` (trivial)
5. AI wiring last, each branch wrapped with its fallback behavior:
   extract-intelligence (#4) → POST /api/jobs generation (#6) →
   integrate-missing (#11)

Eleven endpoints total. All of them respond correctly without an API key —
#4, #6 and #11 have AI branches, and each one degrades to its documented
no-AI fallback (`aiUsed: false`), so the app never requires a model.
