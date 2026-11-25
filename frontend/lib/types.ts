// Types for the whole app.
// Shaped exactly like the FastAPI responses (backend/API.md): the frontend
// fetches these JSON shapes directly.

// ONE master profile (English source). "fr" only ever appears as a
// translated copy of a job's CV — this says which CV version is active.
export type Language = "en" | "fr";

// ===== Master profile (the "CV database") =====

export interface Contact {
  fullName: string;
  targetTitle: string;        // e.g. "Full-Stack Developer"
  phone: string;
  email: string;
  city: string;               // city + country, no street address
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;          // "Feb 2023"
  endDate: string | null;     // null = Present
  bullets: string[];          // quantified impact bullets, never task lists
  technologies: string[];     // what was used there — helps AI polish bullets
}

export interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  links: { label: string; url: string }[];   // "Live", "GitHub"
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;             // "BSc Computer Science"
  major?: string;
  university: string;
  location?: string;
  graduationYear: string;
  coursework?: string[];      // useful early-career, drop when senior
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface SkillGroup {
  id: string;
  category: string;           // "Languages", "Frameworks & Libraries", ...
  skills: string[];
}

export interface MasterProfile {
  contact: Contact;
  summary: string;            // 2-3 sentences, ~100 words, AI or manual
  skillGroups: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];   // optional section, [] if none
  updatedAt: string;          // ISO date
}

// ===== Job pipeline =====

/** One JD requirement — the AI reads these from the job description at
 *  creation (backend/API.md §4b). Matched/missing/score are never stored;
 *  they're computed live from these + the displayed CV. */
export interface Keyword {
  term: string;                    // canonical form, e.g. "PostgreSQL"
  aliases: string[];               // alternate spellings, e.g. ["postgres","psql"]
  tier: "required" | "optional";   // required → red/green + score; optional → orange only
}

export interface Job {
  id: string;
  language: Language;          // ACTIVE version shown/printed: "en" until translated
  title: string;               // job title
  company: string;
  description: string;         // raw pasted job description
  createdAt: string;           // ISO date
  /** The job's SOURCE CV — English, editable. Edits live here, not in the
   *  profile. On the backend this is the master document for translation. */
  cv: MasterProfile;
  /** French copy — AI-translated once and saved (no re-pay on view).
   *  null = never translated. Normalized to null on load for old data. */
  cvFr: MasterProfile | null;
  /** PDF filename override; falls back to a computed default when unset. */
  fileName?: string;
  /** The JD's requirements. Found/missing/score are derived live in the
   *  workspace (lib/cv-text.ts) — never stored, never sent. */
  keywords: Keyword[];
  /** true = AI generated this CV. #6 is AI-required, so always true today;
   *  kept so the UI can tell the story (and for a possible future non-AI path). */
  aiUsed?: boolean;
}

/** Light card list from GET /api/jobs — never ships cv/description/keywords;
 *  score/counts are computed server-side at read (same rule as the live scan). */
export interface JobCard {
  id: string;
  title: string;
  company: string;
  language: Language;
  hasFr: boolean;               // cvFr exists → home shows "EN · FR"
  createdAt: string;
  score: number;
  matchedCount: number;         // required keywords found in cv
  missingCount: number;         // required keywords absent from cv
  fileName?: string | null;
  /** AI used when this CV was created. The server's JobCard does NOT send
   *  it yet — the home badge lights up automatically once it does. */
  aiUsed?: boolean;
}

// ===== API response bodies (small, adopt-as-is) =====

export interface TranslateResponse {
  aiUsed: boolean;
  cvFr: MasterProfile | null;
  language: Language;
}

export interface IntegrateResponse {
  aiUsed: boolean;
  cv: MasterProfile;
  cvFr: MasterProfile | null;
}

// ===== Live AI fallback progress =====

export interface AiProgressEvent {
  provider: string;
  status: "trying" | "failed" | "ok";
  reason: string | null;
}

export interface AiProgress {
  events: AiProgressEvent[];
}
