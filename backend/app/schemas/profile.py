from typing import   Optional , List
from pydantic import BaseModel , Field


class Contact(BaseModel):
    fullName: str = ""
    targetTitle: str = ""
    phone: str = ""
    email: str = ""
    city: str = ""
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None

class SkillGroup(BaseModel):
    id: str
    category: str
    skills: List[str] = []

class Experience(BaseModel):
    id: str
    jobTitle: str
    company: str
    location: str
    startDate: str
    endDate: Optional[str] = None  # None = Present
    bullets: List[str] = []
    technologies: List[str] = []

class ProjectLink(BaseModel):
    label: str
    url: str

class Project(BaseModel):
    id: str
    name: str
    description: str
    techStack: List[str] = []
    links: List[ProjectLink] = []
    bullets: List[str] = []

class Education(BaseModel):
    id: str
    degree: str
    major: Optional[str] = None
    university: str
    location: Optional[str] = None
    graduationYear: str
    coursework: List[str] = []

class Certification(BaseModel):
    id: str
    name: str
    issuer: str
    year: str

class AiIntelligence(BaseModel):
    masterKeywords: List[str] = []
    baselineSummary: str = ""
    lastExtractedAt: Optional[str] = None  # None = never extracted

class ProfileBase(BaseModel):
    contact: Contact = Field(default_factory=Contact)
    summary: str = ""
    skillGroups: List[SkillGroup] = []
    experience: List[Experience] = []
    projects: List[Project] = []
    education: List[Education] = []
    certifications: List[Certification] = []
    aiIntelligence: AiIntelligence = Field(default_factory=AiIntelligence)



class MasterProfileResponse(ProfileBase):
    updatedAt: Optional[str] = None

class ExtractResponse(BaseModel):
    aiUsed: bool
    data: AiIntelligence