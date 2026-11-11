"""Profile endpoints — the whole Page 1 of backend/API.md:

    GET    /api/profile                     -> empty structure first time
    PUT    /api/profile                     -> full replace (autosave)
    DELETE /api/profile                     -> back to empty structure
    POST   /api/profile/extract-intelligence  (AI, always 200 +
    `aiUsed` fallback)

Business logic goes in the endpoint bodies or small helper functions in this
file; this router is where jobs routers will be added as siblings later
(app/routers/jobs.py).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.profile import (
    AiIntelligence,
    ExtractResponse,
    MasterProfileResponse,
    ProfileBase,
)

router = APIRouter()



# DB row -> the profile JSON the frontend expects; the updated_at COLUMN wins.
def to_response(profile: Profile) -> MasterProfileResponse:
    return MasterProfileResponse(
        **{
            **profile.data,
            "updatedAt": profile.updated_at.isoformat() if profile.updated_at else None,
        }
    )


# Empty profile: used by GET (never-saved) and DELETE (reset).
def empty_profile_response() -> MasterProfileResponse:
    return MasterProfileResponse(
        updatedAt=datetime.now(timezone.utc).isoformat()
    )




# GET to get a profile
@router.get("", response_model=MasterProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    

    profile = db.query(Profile).first()
    if profile is None:
        return empty_profile_response()

    return to_response(profile)


# PUT to create or update a profile
@router.put("", response_model=MasterProfileResponse)
def update_profile(data: ProfileBase, db: Session = Depends(get_db)):
    payload = data.model_dump()
    

    profile = db.query(Profile).first()

    if profile is None:
        new_profile = Profile(data=payload)
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        return to_response(new_profile)

    profile.data = payload
    db.commit()
    db.refresh(profile)
    return to_response(profile)


# DELETE to remove a profile and answer with the empty state
@router.delete("", response_model=MasterProfileResponse)
def delete_profile(db: Session = Depends(get_db)):
    

    profile = db.query(Profile).first()
    if profile is None:
        return empty_profile_response()

    db.delete(profile)
    db.commit()
    return empty_profile_response()


@router.post("/extract-intelligence", response_model=ExtractResponse)
def post_intelligence(db: Session = Depends(get_db)):
   

    profile = db.query(Profile).first()
    if profile is None:
        return ExtractResponse(aiUsed=False, data=AiIntelligence())

    res = derive_intelligence(profile.data)
    profile.data = {
        **profile.data,
        "aiIntelligence": res.data.model_dump(),
    }
    db.commit()
    db.refresh(profile)
    return res


def derive_intelligence(profile_data: dict) -> ExtractResponse:
    """Non-AI extraction: keywords from skills + technologies + tech stacks.

    The AI path lands here later (step 4 of the plan): when
    settings.GEMINI_API_KEY is set, call the model inside try/except and fall
    through to this local version on ANY failure — the endpoint and the caller
    never change shape.
    """

    ai_used = False
    groups = profile_data.get("skillGroups", [])
    experience = profile_data.get("experience", [])
    projects = profile_data.get("projects", [])

    skill_words = [s for g in groups for s in g.get("skills", [])]
    tech_words = [t for e in experience for t in e.get("technologies", [])]
    stack_words = [t for p in projects for t in p.get("techStack", [])]

    # First-come order, dedupe, cap at 15.
    keywords = [
        k
        for k in dict.fromkeys(skill_words + tech_words + stack_words)
        if k
    ][:15]

    title = profile_data.get("contact", {}).get("targetTitle", "")
    skills = ", ".join(keywords[:6])
    if title and keywords:
        summary = f"{title} with hands-on experience in {skills}"
    elif title:
        summary = f"{title}"
    elif keywords:
        summary = f"Hands-on experience in {skills}"
    else:
        summary = ""

    names = [p.get("name", "") for p in projects][:2]
    names = [n for n in names if n]
    if names:
        summary += " — shipped projects including " + " and ".join(names)
    if summary:
        summary += "."


    newdata =  AiIntelligence(
        masterKeywords=keywords,
        baselineSummary=summary,
        lastExtractedAt=datetime.now(timezone.utc).isoformat(),
    )

    return  ExtractResponse(aiUsed= ai_used  , data = newdata)
