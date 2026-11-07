"""Profile endpoints — the whole Page 1 of backend/API.md:

    GET    /api/profile/{lang}                    -> empty structure first time
    PUT    /api/profile/{lang}                    -> full replace (autosave)
    DELETE /api/profile/{lang}                    -> back to empty structure
    POST   /api/profile/{lang}/extract-intelligence  (AI, always 200 +
    `aiUsed` fallback)

Business logic goes in the endpoint bodies or small helper functions in this
file; this router is where jobs routers will be added as siblings later
(app/routers/jobs.py).
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.models.profile import Profile
from app.schemas.profile import MasterProfileResponse

router = APIRouter()

LANGS = ("en", "fr")

# GET
@router.get("/{lang}", response_model=MasterProfileResponse)
def get_profile(lang: str, db: Session = Depends(get_db)):
    # Unknown language string -> 404. A known but never-saved profile is NOT a
    # 404: the contract says first load gets the empty structure.
    if lang not in LANGS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown language '{lang}' — use 'en' or 'fr'.",
        )

    profile = db.query(Profile).filter(Profile.lang == lang).first()
    if profile is None:
        # All schema fields have defaults -> ProfileBase() serializes to
        # exactly the empty structure from API.md.
        return MasterProfileResponse(
            updatedAt=datetime.now(timezone.utc).isoformat()
        )

    # The updated_at COLUMN is the source of truth — overwrite whatever is
    # inside the stored JSON so the client always sees the server's value.
    return MasterProfileResponse(
        **{
            **profile.data,
            "updatedAt": profile.updated_at.isoformat() if profile.updated_at else None,
        }
    )
 

# Page 1 — Profile (/profile)
# GET /api/profile/{lang}
# Where/why: /profile mount + every language switch.
# Request body: none.
# Unknown lang → 404.
# Never-saved profile → 200 with the empty structure below. Deliberate: no seed/demo data, so real saved data can never be confused with samples. The empty structure is also exactly what DELETE returns.
# {
#   "contact": { "fullName": "", "targetTitle": "", "phone": "", "email": "",
#                "city": "", "github": "", "linkedin": "", "portfolio": "" },
#   "summary": "",
#   "skillGroups": [],
#   "experience": [],
#   "projects": [],
#   "education": [],
#   "certifications": [],
#   "aiIntelligence": { "masterKeywords": [], "baselineSummary": "", "lastExtractedAt": null },
#   "updatedAt": "<ISO now>"
# }







# PUT /api/profile/{lang}
# Where/why: debounced autosave of every edit on /profile.
# Request body: full MasterProfile (same shape as above response).
# Response 200: stored MasterProfile with fresh updatedAt.
# Full replace — replace the entire JSON, nothing merged.
# 422 malformed body; 404 unknown lang.
# DELETE /api/profile/{lang}
# Where/why: the "Reset data" button (client confirms first).
# Response 200: the same empty MasterProfile as a first-time GET. (Not 204 — the client adopts the returned object as its new state.)
# POST /api/profile/{lang}/extract-intelligence ⚡ AI
# Where/why: the explicit "Save & extract" button. The only AI call on this page. Server reads the stored profile itself — no body to send.
# Response 200 (AI path): { "aiUsed": true, "data": AiIntelligence }
# Response 200 (fallback, ≤ ~10 s): { "aiUsed": false, "data": AiIntelligence } where the fallback derives keywords locally from skillGroups.skills + experience[].technologies + projects[].techStack (max ~15) and builds a template baseline summary. Never 500.
# Server merges data into the stored profile (aiIntelligence + new updatedAt); the client replaces its aiIntelligence block.
# Why this exists: masterKeywords is the dictionary every job analysis runs against, and baselineSummary is what later tailor prompts may start from.