"""Job endpoints — backend/API.md pages 2-3:

    GET    /api/jobs          -> light JobCard list, newest first
    POST   /api/jobs          -> create the job: CV + analysis in one response
    GET    /api/jobs/{id}     -> full job (workspace mount)
    PATCH  /api/jobs/{id}     -> rename title/fileName, flip active language
    PUT    /api/jobs/{id}/cv  -> autosave: replace cv or cvFr
    DELETE /api/jobs/{id}     -> 204 (trash icon)

The AI seam lives in `generate_job()`: today it runs the fallback
(frozen profile copy + local analysis, aiUsed=False); the Gemini branch
lands inside exactly that function later — the endpoints never change.
"""
import re
from datetime import datetime, timezone
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
    GapAnalysis,
    Job,
    JobCard,
    PatchJobRequest,
    MasterProfileResponse,
    JobCvBody
)
from app.schemas.profile import Experience, Project

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


def analyze_for_job(
    jd_text: str, cv_data: dict, required: list[str] | None = None
) -> GapAnalysis:
    """Rules 2-4 — required (Option B: the list #6's model extracted from
    the JD; fallback = master keywords found in the JD), matched vs missing
    against cv_text, score."""
    text = cv_text(cv_data)

    if required is None:
        jd = jd_text.lower()
        required = [
            k
            for k in cv_data.get("aiIntelligence", {}).get("masterKeywords", [])
            if k.lower() in jd
        ]

    matched = [k for k in required if k.lower() in text]
    missing = [k for k in required if k.lower() not in text]
    total = len(matched) + len(missing) or 1

    return GapAnalysis(
        score=round(len(matched) / total * 100),
        matched=matched,
        missing=missing,
        notes={},
        added=[],
    )


# ---------- the generation seam ----------


def generate_job(body: CreateJobRequest, profile_data: dict) -> dict:
    """The ONE place the job's CV is born.

    AI branch (ai_used=True): the model reads profile + JD and returns
    {title, company, summary, requiredKeywords, experience, projects};
    code merges the verbatim parts, drops any entry whose id isn't in the
    profile (never-invent), then runs the SAME analyze_for_job()
    verification with required = the model's list (Option B, 4b).
    Fallback (no key / any failure, ai_used=False): freeze the profile
    copy, title from the first JD line, required = master keywords in the
    JD. Never raises.
    """
    first_line = next(
        (l.strip() for l in body.description.splitlines() if l.strip()), ""
    )
    detected_title = re.sub(r"^#+\s*", "", first_line)[:80]

    cv = {**profile_data}
    title = detected_title
    company = ""
    required = None
    ai_used = False

    try:
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
            '  "summary": "<80-120 word professional summary rewritten for '
            'THIS job>",\n'
            '  "requiredKeywords": ["<skill terms this JD demands, as short '
            'strings>"],\n'
            "  \"experience\": [ <some of the profile's experience entries, "
            "see rules> ],\n"
            "  \"projects\": [ <some of the profile's projects entries, see "
            "rules> ]\n"
            "}\n\n"
            "## Hard rules\n"
            "1. You return ONLY title, company, summary, requiredKeywords, "
            "experience, projects. Everything else in the profile (contact, "
            "education, certifications, skillGroups, aiIntelligence) is "
            "copied by the code — never echo it, never change it.\n"
            "2. experience and projects: reuse ONLY entries that exist in "
            "the profile, keeping each entry's original \"id\". Drop entries "
            "irrelevant to this JD. Reorder the rest by relevance to the "
            "JD.\n"
            "3. Rewrite summary and bullets to fit the JD's language — but "
            "every number, employer, project, date, degree and skill must "
            "come from the profile. NEVER invent or exaggerate.\n"
            "4. If the JD demands a skill the profile cannot support with "
            "real facts, leave it out of the CV — it is supposed to show as "
            "a missing keyword.\n"
            "5. requiredKeywords: list the concrete skills/tools/practices "
            "this JD demands (React, Agile, code review…), NOT sentences "
            "from the JD.\n"
            "6. company: only if explicitly named in the JD; otherwise "
            "empty string.\n"
        )
        text = call(prompt)
        raw = json.loads(text)
        if not isinstance(raw, dict):
            raise ValueError("reply is not a JSON object")

        summary = raw.get("summary")
        title_raw = raw.get("title")
        company_raw = raw.get("company")
        if not isinstance(summary, str) or not summary.strip():
            raise ValueError("bad summary")
        if not isinstance(title_raw, str) or not isinstance(company_raw, str):
            raise ValueError("bad title/company")

        exp_ids = {e.get("id") for e in profile_data.get("experience", [])}
        prj_ids = {p.get("id") for p in profile_data.get("projects", [])}
        exps_raw, prjs_raw = raw.get("experience"), raw.get("projects")
        if not isinstance(exps_raw, list) or not isinstance(prjs_raw, list):
            raise ValueError("experience/projects must be lists")
        exps = [e for e in (Experience(**x) for x in exps_raw) if e.id in exp_ids]
        prjs = [p for p in (Project(**x) for x in prjs_raw) if p.id in prj_ids]
        # Model broke the reuse rule if nothing usable came back while the
        # profile has entries — don't ship an empty-handed CV.
        if profile_data.get("experience") and not exps:
            raise ValueError("no reusable experience")
        if profile_data.get("projects") and not prjs:
            raise ValueError("no reusable projects")

        cv = {
            **profile_data,
            "summary": summary.strip(),
            "experience": [e.model_dump() for e in exps],
            "projects": [p.model_dump() for p in prjs],
        }
        title = title_raw.strip() or detected_title
        company = company_raw.strip()

        req_raw = raw.get("requiredKeywords")
        if isinstance(req_raw, list):
            cleaned = list(
                dict.fromkeys(str(x).strip() for x in req_raw if str(x).strip())
            )
            required = cleaned[:20] or None
        ai_used = True
    except Exception as e:
        print(e)
        ai_used = False
        cv = {**profile_data}
        title = detected_title
        company = ""
        required = None

    analysis = analyze_for_job(body.description, cv, required)

    return {
        "cv": cv,
        "title": title,
        "company": company,
        "analysis": analysis,
        "ai_used": ai_used,
    }


# ---------- row -> response helpers ----------


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
        analysis=GapAnalysis(**row.analysis),
        aiUsed=row.ai_used,
    )

# for the home page
def to_card(row: JobModel) -> JobCard:
    return JobCard(
        id=row.id,
        title=row.title,
        company=row.company,
        language=row.language,
        hasFr= row.cv_fr is not None ,
        createdAt=row.created_at.isoformat(),
        score=row.analysis.get("score", 0),
        matchedCount=len(row.analysis.get("matched", [])),
        missingCount=len(row.analysis.get("missing", [])),
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

    generated = generate_job(body, frozen)

    job = JobModel(
        id=f"job-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        language="en",
        title=generated["title"],
        company=generated["company"],
        description=body.description,  # verbatim, not the trimmed one
        cv=generated["cv"],
        analysis=generated["analysis"].model_dump(),
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
    db.commit()
    db.refresh(job)
    return MasterProfileResponse(**(job.cv_fr if which == "fr" else job.cv))




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


