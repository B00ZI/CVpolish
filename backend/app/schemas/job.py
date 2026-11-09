"""Pydantic schemas for the jobs endpoints (request + response bodies).

Validation-only layer: shapes come 1:1 from backend/API.md (Page 2 + 3).
The router imports these to validate what arrives and to guarantee what
leaves. Field names are camelCase — identical to the frontend types.
"""
from typing import Literal, List, Optional
from pydantic import BaseModel, Field

from app.schemas.profile import MasterProfileResponse, ProfileBase

Language = Literal["en", "fr"]


# ---------- requests ----------

class CreateJobRequest(BaseModel):
    """Body of POST /api/jobs — create + analyze in one call."""
    language: Language
    # Empty-after-trim and the 50k cap are checked in the router (422).
    description: str = Field(min_length=1, max_length=50_000)


class PatchJobRequest(BaseModel):
    """Body of PATCH /api/jobs/{id} — send ONLY the fields that changed.
    A field left out (None) means "don't touch it"."""
    title: Optional[str] = None
    fileName: Optional[str] = None


class JobCvBody(BaseModel):
    """Body of PUT /api/jobs/{id}/cv — the whole edited frozen CV,
    full replace (same semantics as PUT /api/profile/{lang})."""
    cv: ProfileBase


# ---------- responses / data ----------

class GapAnalysis(BaseModel):
    """Result of comparing the JD text against the frozen cv's keywords.
    Always set at creation — no nullable analysis anywhere."""
    score: int                    # round(matched / (matched + missing) * 100)
    matched: List[str] = []
    missing: List[str] = []
    notes: dict = {}              # legacy, always {}
    added: List[str] = []         # legacy, always []


class JobCard(BaseModel):
    """Light projection for GET /api/jobs (home cards) — never ships cv,
    description or the analysis object, only what the card renders."""
    id: str
    title: str
    company: str = ""            
    location: Optional[str] = None
    language: Language
    createdAt: str
    score: int
    matchedCount: int
    missingCount: int
    fileName: Optional[str] = None


class Job(BaseModel):
    """The full job returned by POST /api/jobs, GET /api/jobs/{id} and PATCH.
    rewrites/tailored are legacy fields kept only for old browser data —
    the backend always sends them empty/null and never stores them."""
    id: str
    language: Language
    title: str
    company: str = ""
    location: Optional[str] = None
    description: str
    createdAt: str
    cv: MasterProfileResponse
    fileName: Optional[str] = None
    analysis: GapAnalysis
    aiUsed: bool = False
    rewrites: List[dict] = []
    tailored: Optional[dict] = None
