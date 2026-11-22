"""Profile endpoints — the whole Page 1 of backend/API.md:

    GET    /api/profile    -> empty structure first time
    PUT    /api/profile    -> full replace (autosave)
    DELETE /api/profile    -> back to empty structure

(Extract-intelligence #4 was removed 2026-11-22 with the keyword redesign:
keywords now come from #6's model at job creation, so the profile page
needs no AI call at all.)

Business logic goes in the endpoint bodies or small helper functions in this
file; this router is where jobs routers will be added as siblings later
(app/routers/jobs.py).
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.profile import (
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
