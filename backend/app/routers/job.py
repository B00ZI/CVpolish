"""Job endpoints — backend/API.md pages 2-3:

    GET    /api/jobs          -> light JobCard list, newest first
    POST   /api/jobs          -> create the job: AI writes cv + keywords
    GET    /api/jobs/{id}     -> full job (workspace mount)
    PATCH  /api/jobs/{id}     -> rename title/fileName, flip active language
    PUT    /api/jobs/{id}/cv  -> autosave: replace cv or cvFr
    DELETE /api/jobs/{id}     -> 204 (trash icon)

AI is required for AI features: create/translate/integrate answer 503 with
a readable detail when the model can't run — no fake fallback CVs. The
scan itself never uses AI: the frontend computes chips/score live from
`keywords` + the displayed CV; `to_card` runs the SAME rule at read time
for the home list (API.md §4b — change both sides in one commit).
"""
import re
from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4
from app.core.ai import call
import json 
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.job import Job as JobModel
from app.models.profile import Profile
from app.routers.profile import to_response
from app.schemas.job import (
    CreateJobRequest,
    Keyword,
    Job,
    JobCard,
    PatchJobRequest,
    MasterProfileResponse,
    JobCvBody,
    TranslateRequest,
    TranslateResponse,
    IntegrateMissingRequest,
    IntegrateMissingResponse,
)
from app.schemas.profile import Experience, Project, SkillGroup

router = APIRouter()


# ---------- Keyword scan contract (backend/API.md 4b) ----------
# Must produce the same numbers as frontend/lib/cv-text.ts. Change both together.


def cv_text(cv_data: dict) -> str:
    """Rule 1 — the exact text the scan sees, lowercased. Nothing else."""
    parts = [
        cv_data.get("contact", {}).get("fullName", ""),
        cv_data.get("contact", {}).get("targetTitle", ""),
        cv_data.get("summary", ""),
    ]
    for e in cv_data.get("experience", []):
        parts.extend(
            [
                e.get("jobTitle", ""),
                e.get("company", ""),
                e.get("location", ""),
                " ".join(e.get("technologies", [])),
                " ".join(e.get("bullets", [])),
            ]
        )
    for prj in cv_data.get("projects", []):
        parts.extend(
            [
                prj.get("name", ""),
                " ".join(prj.get("techStack", [])),
                prj.get("description", ""),
                " ".join(prj.get("bullets", [])),
            ]
        )
    for g in cv_data.get("skillGroups", []):
        parts.append(" ".join(g.get("skills", [])))
    for ed in cv_data.get("education", []):
        parts.extend(
            [
                ed.get("degree", ""),
                ed.get("major", ""),
                ed.get("university", ""),
                ed.get("location", ""),
            ]
        )
    for cert in cv_data.get("certifications", []):
        parts.extend([cert.get("name", ""), cert.get("issuer", "")])
    return " ".join(parts).lower()


def _hit(text: str, term: str) -> bool:
    """Rule 3 — case-insensitive word-boundary match (`text` is already
    lowercased). Guards only where the term's edge is a word char, so
    C++, C#, .net and Node.js still match; "git" no longer matches
    "github". The frontend twin lives in cv-text.ts."""
    t = term.lower().strip()
    if not t:
        return False
    pat = re.escape(t)
    if t[0].isalnum():
        pat = r"(?<![a-z0-9])" + pat
    if t[-1].isalnum():
        pat = pat + r"(?![a-z0-9])"
    return re.search(pat, text) is not None


def keyword_hit(text: str, kw: dict) -> bool:
    """Rule 3 for a whole keyword: the term OR any alias hits."""
    if _hit(text, str(kw.get("term", ""))):
        return True
    return any(_hit(text, str(a)) for a in kw.get("aliases") or [])


def score_keywords(cv_data: dict, keywords: list) -> tuple[int, int, int]:
    """Rules 3-4 — (score, required-found, required-missing) against
    cv_text. Score counts the `required` tier only; optional keywords
    never move it. 0 when the JD states no required keyword."""
    text = cv_text(cv_data)
    required = [k for k in keywords if (k or {}).get("tier") == "required"]
    found = sum(1 for k in required if keyword_hit(text, k))
    total = len(required)
    score = round(found / total * 100) if total else 0
    return score, found, total - found


def clean_keywords(raw) -> list[dict]:
    """Rule 2 — validate what the model returned: strip, drop empties,
    dedupe terms case-insensitively, ≤5 aliases each (alias ≠ term),
    tier defaults to 'required'. No count cap — the model self-curates."""
    if not isinstance(raw, list):
        raise ValueError("keywords must be a list")
    out: list[dict] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        term = str(item.get("term", "")).strip()
        if not term or term.lower() in seen:
            continue
        seen.add(term.lower())
        aliases: list[str] = []
        raw_aliases = item.get("aliases")
        if isinstance(raw_aliases, list):
            for a in raw_aliases:
                a = str(a).strip()
                if (
                    a
                    and a.lower() != term.lower()
                    and a.lower() not in {x.lower() for x in aliases}
                    and len(aliases) < 5
                ):
                    aliases.append(a)
        tier = "optional" if item.get("tier") == "optional" else "required"
        out.append({"term": term, "aliases": aliases, "tier": tier})
    return out


def validate_skill_groups(returned, source_groups: list) -> list[dict]:
    """Rule 9 — the model may regroup/reorder/rename groups, but the exact
    skill multiset must survive: none dropped, none invented, no duplicates."""
    if not isinstance(returned, list):
        raise ValueError("skillGroups must be a list")
    groups = [SkillGroup(**g) for g in returned]

    def key(s):
        return " ".join(str(s).split()).casefold()

    before = Counter(key(s) for g in source_groups for s in g.get("skills", []))
    after = Counter(key(s) for g in groups for s in g.skills)
    dropped = list((before - after).elements())
    invented = list((after - before).elements())
    if dropped or invented:
        raise ValueError(f"skillGroups changed: dropped={dropped} invented={invented}")
    return [g.model_dump() for g in groups]


def _parse_json(text):
    """Accept the model's reply even when it wrapped it in ```json fences.
    Rule 0 asks for raw JSON; free-tier replies fence often enough that
    stripping is cheaper than a spurious 503. None/bare text still raises."""
    if not isinstance(text, str):
        raise ValueError("no reply from the model")
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return json.loads(s)


# ---------- the generation seam ----------


def generate_job(body: CreateJobRequest, profile_data: dict) -> dict:
    """The ONE place the job's CV is born. AI is required: the model reads
    profile + JD and returns {title, company, summary, keywords, experience,
    projects}; code merges the verbatim parts, drops any entry whose id
    isn't in the profile (never-invent), validates the keyword list.
    On ANY failure this raises — create_job turns it into a 503 and NO row
    is written (AI-required rule: honest error, no fake fallback CV).
    """
    first_line = next(
        (l.strip() for l in body.description.splitlines() if l.strip()), ""
    )
    detected_title = re.sub(r"^#+\s*", "", first_line)[:80]

    prompt = (
        "You are tailoring one candidate's CV to one specific job "
        "description.\nReturn ONLY raw JSON — no markdown, no code "
        "fences, no commentary.\n\n"
        "## Job description\n" + body.description + "\n\n"
        "## Candidate profile (the ONLY source of facts — never invent "
        "anything outside it)\n" + json.dumps(profile_data) + "\n\n"
        "## Return exactly this JSON structure\n"
        "{\n"
        '  "title": "<job title, read from the JD heading/first line>",\n'
        '  "company": "<company name if the JD explicitly states one, '
        'else empty string>",\n'
        '  "keywords": [\n'
        '    { "term": "<concrete skill/tool/practice from ANY section of '
        'the JD>",\n'
        '      "aliases": ["<other spellings/phrasings of the SAME term a '
        'CV might use; [] if none>"],\n'
        '      "tier": "required" }\n'
        "  ],\n"
        '  "application_notes": [\n'
        '    "<up to 4 short strings for non-skill requirements, work '
        'mode, languages, or submission rules>"\n'
        "  ],\n"
        '  "summary": "<80-120 word professional summary rewritten for '
        'THIS job>",\n'
        '  "experience": [ <subset of profile experience entries, see '
        "rules> ],\n"
        '  "projects": [ <subset of profile projects entries, see rules> '
        "],\n"
        '  "skillGroups": [\n'
        "    {\n"
        '      "id": "<keep existing group id or short slug>",\n'
        '      "category": "<JD-relevant group name>",\n'
        '      "skills": ["<existing skill from profile>"]\n'
        "    }\n"
        "  ]\n" 
        "}\n\n"
        "## Hard rules\n"
        "1. Return ONLY title, company, keywords, application_notes, "
        "summary, experience, projects, skillGroups. Never echo "
        "contact, education, or certifications.\n"
        "2. keywords: scan the ENTIRE JD (intro, stack, "
        "responsibilities, required qualifications, and bonus/nice-to-have "
        "sections) and include EVERY concrete skill, tool, language, "
        "framework, protocol, or engineering practice mentioned — "
        "including lowercase items (e.g. kafka -> Kafka) and skills the "
        "candidate lacks. Skip soft-skill clichés and non-skill rules. "
        "Use short canonical terms, NOT sentences.\n"
        "3. tier: \"required\" when stated as a must / hard requirement; "
        "\"optional\" when nice-to-have / preferred / bonus.\n"
        "4. aliases: alternate spellings, abbreviations, and common "
        "phrasings of the SAME concept (\"postgres\", \"psql\" for "
        "PostgreSQL; \"rest api\", \"rest apis\", \"api endpoints\" for "
        "RESTful APIs). Never a different technology (GraphQL is not an "
        "alias of REST). \"[]\" when none.\n"
        "5. experience and projects: reuse ONLY entries from the profile "
        "with their original \"id\". Drop irrelevant entries; order the "
        "rest by relevance. Keep all bullets and stack items on kept "
        "entries unless trimming redundant wording.\n"
        "6. Rewrite summary and bullets for THIS job using ONLY facts "
        "from the profile. Copy numbers, dates, and percentages/deltas "
        "verbatim — never recompute or round them. Whenever a keyword "
        "in `keywords` is supported by facts or tools in the profile "
        "(such as FastAPI/Express/API work supporting RESTful APIs), "
        "include that exact `term` string at least once in summary or a "
        "bullet so ATS matching finds it. Never insert unsupported "
        "skills into the CV. Weave special JD codes/phrases in "
        "naturally without meta-phrasing like \"Mentioning X\".\n"
        "7. application_notes: 3-4 concise strings for years of "
        "experience, location/remote mode, language expectations, or "
        "application/link/code instructions.\n"
        "8. company: only if explicitly named in the JD; otherwise "
        "empty string.\n"
        "9. skillGroups: regroup and order the candidate's existing "
        "skills into categories suited to this JD (such as Backend & "
        "APIs, Databases, Cloud & DevOps, Frontend & UI, Tools). Keep "
        "every skill from the profile without dropping or inventing "
        "skills.\n"
    )
    text = call(prompt)
    raw = _parse_json(text)       # None / bad JSON / stray fences -> raises
    if not isinstance(raw, dict):
        raise ValueError("reply is not a JSON object")

    summary = raw.get("summary")
    title_raw = raw.get("title")
    company_raw = raw.get("company")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("bad summary")
    if not isinstance(title_raw, str) or not isinstance(company_raw, str):
        raise ValueError("bad title/company")

    keywords = clean_keywords(raw.get("keywords"))
    if not keywords:
        raise ValueError("no keywords")

    exp_ids = {e.get("id") for e in profile_data.get("experience", [])}
    prj_ids = {p.get("id") for p in profile_data.get("projects", [])}
    exps_raw, prjs_raw = raw.get("experience"), raw.get("projects")
    if not isinstance(exps_raw, list) or not isinstance(prjs_raw, list):
        raise ValueError("experience/projects must be lists")
    exps = [e for e in (Experience(**x) for x in exps_raw) if e.id in exp_ids]
    prjs = [p for p in (Project(**x) for x in prjs_raw) if p.id in prj_ids]
    if len(exps) < len(exps_raw):
        print(f"generate: dropped {len(exps_raw) - len(exps)} unknown experience id(s)")
    if len(prjs) < len(prjs_raw):
        print(f"generate: dropped {len(prjs_raw) - len(prjs)} unknown project id(s)")
    # Model broke the reuse rule if nothing usable came back while the
    # profile has entries — don't ship an empty-handed CV.
    if profile_data.get("experience") and not exps:
        raise ValueError("no reusable experience")
    if profile_data.get("projects") and not prjs:
        raise ValueError("no reusable projects")

    skill_groups = validate_skill_groups(
        raw.get("skillGroups"), profile_data.get("skillGroups", [])
    )

    cv = {
        **profile_data,
        "summary": summary.strip(),
        "experience": [e.model_dump() for e in exps],
        "projects": [p.model_dump() for p in prjs],
        "skillGroups": skill_groups,
    }

    return {
        "cv": cv,
        "title": title_raw.strip() or detected_title,
        "company": company_raw.strip(),
        "keywords": keywords,
        "ai_used": True,
    }


# ---------- row -> response helpers ----------


def row_keywords(row: JobModel) -> list:
    """The stored keyword list (the analysis JSONB column now holds it).
    Old dict-shaped rows (impossible since the jobs table was emptied —
    guarded anyway) read as []."""
    raw = row.analysis
    return [k for k in raw if isinstance(k, dict)] if isinstance(raw, list) else []


def to_response_job(row: JobModel) -> Job:
    return Job(
        id=row.id,
        language=row.language,
        title=row.title,
        company=row.company,
        description=row.description,
        createdAt=row.created_at.isoformat(),
        cv=row.cv,
        cvFr=row.cv_fr,
        fileName=row.file_name,
        keywords=[Keyword(**k) for k in row_keywords(row)],
        aiUsed=row.ai_used,
    )

# for the home page — score/counts computed HERE at read time (cards never
# ship the CV), same §4b rule the frontend runs live in the workspace.
def to_card(row: JobModel) -> JobCard:
    score, matched, missing = score_keywords(row.cv or {}, row_keywords(row))
    return JobCard(
        id=row.id,
        title=row.title,
        company=row.company,
        language=row.language,
        hasFr= row.cv_fr is not None ,
        createdAt=row.created_at.isoformat(),
        score=score,
        matchedCount=matched,
        missingCount=missing,
        fileName=row.file_name,
    )


# ---------- endpoints ----------


@router.get("", response_model=list[JobCard])
def list_jobs(db: Session = Depends(get_db)):
    rows = db.query(JobModel).order_by(JobModel.created_at.desc()).all()
    return [to_card(r) for r in rows]


@router.post("", response_model=Job, status_code=status.HTTP_201_CREATED)
def create_job(body: CreateJobRequest, db: Session = Depends(get_db)):
    if len(body.description.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="description can't be empty",
        )

    profile = db.query(Profile).first()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="provide a profile to create jobs",
        )

    # model_dump at the DB border: the frozen cv ships as plain JSON.
    frozen = to_response(profile).model_dump()

    # AI is required: any model/validation failure -> honest 503, NO row.
    try:
        generated = generate_job(body, frozen)
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI couldn't generate a CV — nothing was created. Try again in a moment.",
        )

    job = JobModel(
        id=f"job-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{uuid4().hex[:8]}",
        language="en",
        title=generated["title"],
        company=generated["company"],
        description=body.description,  # verbatim, not the trimmed one
        cv=generated["cv"],
        analysis=generated["keywords"],   # JSONB column holds the keyword list
        ai_used=generated["ai_used"],
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return to_response_job(job)




@router.get("/{id}", response_model=Job)
def get_job(id : str , db: Session = Depends(get_db)):

    job =  db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"no job with id {id}",
            )
    return to_response_job(job)
# rename title / fileName, flip the active language (EN/FR toggle)

@router.patch("/{id}", response_model=Job)
def patch_job(id: str, body: PatchJobRequest, db: Session = Depends(get_db)):
    job = db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no job with id {id}",
        )

    if body.language == "fr" and job.cv_fr is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="no cvFr translate first",
        )
    if body.title is not None and not body.title.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="title can't be empty",
        )
    if body.fileName is not None and not body.fileName.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="filename can't be empty",
        )

    if body.title is not None:
        job.title = body.title
    if body.fileName is not None:
        job.file_name = body.fileName
    if body.language is not None:
        job.language = body.language

    db.commit()
    db.refresh(job)
    return to_response_job(job)






# autosave: replace the document the body asks for (else the active one)

@router.put("/{id}/cv", response_model=MasterProfileResponse)
def put_job_cv(id: str, body: JobCvBody, db: Session = Depends(get_db)):
    job = db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no job with id {id}",
        )

    # One target, used for the guard, the write and the response.
    which = body.language or job.language
    if which == "fr" and job.cv_fr is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="no cvFr translate first",
        )

    dump = body.cv.model_dump()
    if which == "fr":
        job.cv_fr = dump
    else:
        job.cv = dump
        # No analysis to refresh: chips/score are computed live by the
        # frontend and at read time by to_card — stored keywords never
        # depend on the CV text.
    db.commit()
    db.refresh(job)
    return MasterProfileResponse(**(job.cv_fr if which == "fr" else job.cv))




# AI translate (API.md #12) — cache rule FIRST: a French CV is paid once.
@router.post("/{id}/translate", response_model=TranslateResponse)
def translate_job(id: str, body: TranslateRequest, db: Session = Depends(get_db)):
    job = db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"no job with id {id}",
        )
    if body.target != "fr":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail='only target "fr" is supported',
        )

    # Existing copy + no force -> hand it back, flip the view, no model call.
    if job.cv_fr is not None and not body.force:
        job.language = "fr"
        db.commit()
        db.refresh(job)
        return TranslateResponse(
            aiUsed=False, cvFr=MasterProfileResponse(**job.cv_fr), language="fr"
        )

    source = job.cv or {}
    try:
        prompt = (
            "You translate a CV from English to French.\n"
            "Return ONLY raw JSON — no markdown, no code fences, no "
            "commentary.\n\n"
            "## English CV (source)\n" + json.dumps(source) + "\n\n"
            "## Rules\n"
            "1. Translate every human-readable string to natural French: "
            "summary, job titles, bullets, skill group categories, degree, "
            "project descriptions, locations (\"Casablanca, Morocco\" -> "
            "\"Casablanca, Maroc\").\n"
            "2. Keep EXACTLY as they are: every \"id\" value; urls, emails "
            "and phone numbers; tech/product names (React, Next.js, Docker, "
            "PostgreSQL...); and the machine timestamps updatedAt and "
            "lastExtractedAt.\n"
            "3. Keep the JSON structure identical — same keys, same nesting, "
            "same entries in the same order. Never drop, add or reorder "
            "anything.\n"
            "4. Dates inside text: English month names become French "
            "abbreviations (\"Feb 2023\" -> \"févr. 2023\"). A null endDate "
            "becomes the string \"Aujourd'hui\".\n"
        )
        text = call(prompt)
        raw = _parse_json(text)
        translated = MasterProfileResponse(**raw)  # shape must survive
        data = translated.model_dump()

        # Structure guard: ids are never translated, so the id lists must be
        # identical — catches empty/crippled replies before they get stored.
        if [e.get("id") for e in source.get("experience", [])] != [
            e.get("id") for e in data.get("experience", [])
        ]:
            raise ValueError("experience structure changed")
        if [p.get("id") for p in source.get("projects", [])] != [
            p.get("id") for p in data.get("projects", [])
        ]:
            raise ValueError("projects structure changed")

        # Code wins on machine fields — never trust the model with them.
        data["updatedAt"] = source.get("updatedAt")

        job.cv_fr = data            # JSONB: reassign, never mutate in place
        job.language = "fr"
        db.commit()
        db.refresh(job)
        return TranslateResponse(
            aiUsed=True, cvFr=MasterProfileResponse(**data), language="fr"
        )
    except Exception as e:
        print(e)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The French version couldn't be generated — AI is unavailable. Try again in a moment.",
        )


@router.post("/{id}/integrate-missing", response_model=IntegrateMissingResponse)
def integrate_missing(id: str, body: IntegrateMissingRequest, db: Session = Depends(get_db)):
    job = db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
        raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"no job with id {id}",
            )
    if not body.prompt or not body.prompt.strip():
        raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"prompt cant be empty",
                        )
    
    which = body.language or job.language
    if which == "fr" and job.cv_fr is None:
                 raise HTTPException(
                      status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                      detail="no cvFr translate first",)

    if which == "fr":
            source = job.cv_fr  
    else:
            source =  job.cv 

    try:
         prompt = (
             "You edit a CV at the user's request. Return ONLY raw JSON — "
             "no markdown, no commentary.\n\n"
             "## Task (the user's instruction — do exactly this, nothing "
             "more)\n" + body.prompt + "\n\n"
             "## CV\n" + json.dumps(source) + "\n\n"
             "## Rules\n"
             "1. MINIMAL DIFF: change only what the Task asks. \"Add X to "
             "project Y\" -> only that changes; every other string comes "
             "back identical. Never a full rewrite.\n"
             "2. Editable: summary, experience, projects, skills. Locked "
             "byte-for-byte: contact, education, certifications — copy "
             "exactly.\n"
             "3. Same ids, same entries, same order — never add, remove or "
             "reorder.\n"
             "4. Never invent employers, dates, titles or numbers.\n"
             "5. Write in the CV's own language (French CV -> French text); "
             "tech names (GraphQL, React) stay as-is.\n"
         )
         text = call(prompt)
         raw = _parse_json(text)
         data = MasterProfileResponse(**raw).model_dump()

         # Locked sections: contact, education, certifications never change.
         for key in ("contact", "education", "certifications"):
             if data.get(key) != source.get(key):
                 raise ValueError(f"{key} must not change")

         # Code wins on machine fields — never trust the model with them.
         data["updatedAt"] = source.get("updatedAt")

         if which == "fr":
               job.cv_fr = data
         else:
               job.cv = data
               # No analysis to refresh — live scan + to_card own it.

         if [e.get("id") for e in source.get("experience", [])] != [
                     e.get("id") for e in data.get("experience", [])
                 ]:
                     raise ValueError("experience structure changed")
         
         if [p.get("id") for p in source.get("projects", [])] != [
                     p.get("id") for p in data.get("projects", [])
                 ]:
                     raise ValueError("projects structure changed")

         
         db.commit()
         db.refresh(job)
         return IntegrateMissingResponse( 
            aiUsed= True , cv = job.cv , cvFr = job.cv_fr

         )

         

    except Exception as e :
         print(e)
         db.rollback()
         raise HTTPException(
             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
             detail="AI couldn't complete the edit — nothing was changed. Try again in a moment.",
         )


              




@router.delete("/{id}", status_code=204)
def delete_job(id: str, db: Session = Depends(get_db)) :

    job =  db.query(JobModel).filter(JobModel.id == id).first()
    if job is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"no job with id {id}",
                    )

    db.delete(job)
    db.commit()
    return


