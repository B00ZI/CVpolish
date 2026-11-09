"""Job endpoints — Page 2 of backend/API.md:

    GET  /api/jobs  -> light JobCard list, newest first
    POST /api/jobs  -> create the job: CV + analysis in the same response

The AI seam lives in `generate_job()`: today it runs the fallback
(frozen profile copy + local analysis, aiUsed=False); the Gemini branch
lands inside exactly that function later — the endpoints never change.
"""
import re
from datetime import datetime, timezone

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
)

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


def analyze_for_job(jd_text: str, cv_data: dict) -> GapAnalysis:
    """Rules 2-4 — universe/masterKeywords, required in the JD,
    matched vs missing against cv_text, score."""
    jd = jd_text.lower()
    text = cv_text(cv_data)

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

    Fallback (today, aiUsed=False): freeze the profile copy as-is, detect the
    title from the first JD line, analyze locally.

    AI branch (added later, same return keys): when settings.GEMINI_API_KEY is
    set, generate the tailored CV here — contact/education/certifications
    verbatim, summary/experience/projects rewritten from the real entries
    (drop irrelevant, order by relevance, never invent) — then fall through
    to the exact same analyze_for_job() verification on ANY failure.
    """
    cv = {**profile_data}

    first_line = next(
        (l.strip() for l in body.description.splitlines() if l.strip()), ""
    )
    title = re.sub(r"^#+\s*", "", first_line)[:80]

    analysis = analyze_for_job(body.description, cv)

    return {
        "cv": cv,
        "title": title,
        "company": "",
        "analysis": analysis,
        "ai_used": False,
    }


# ---------- row -> response helpers ----------


def to_response_job(row: JobModel) -> Job:
    return Job(
        id=row.id,
        language=row.language,
        title=row.title,
        company=row.company,
        location=None,
        description=row.description,
        createdAt=row.created_at.isoformat(),
        cv=row.cv,
        fileName=row.file_name,
        analysis=GapAnalysis(**row.analysis),
        aiUsed=row.ai_used,
    )


def to_card(row: JobModel) -> JobCard:
    return JobCard(
        id=row.id,
        title=row.title,
        company=row.company,
        location=None,
        language=row.language,
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

    profile = db.query(Profile).filter(Profile.lang == body.language).first()
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
        language=body.language,
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
