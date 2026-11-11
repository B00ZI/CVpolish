// Types for the whole app.
// Shaped like the future FastAPI responses: when the backend exists,
// endpoints return exactly these JSON shapes and the swap from mock -> API is easy.

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

// AI keeps a distilled view of the profile: the keyword dictionary and a
// baseline summary it can start rewrites from. Computed on explicit save.
export interface AiIntelligence {
  masterKeywords: string[];   // extracted from skills, technologies, tech stacks
  baselineSummary: string;    // neutral base line the AI rewrites per job
  lastExtractedAt: string | null; // ISO date of last extraction
}

export interface MasterProfile {
  contact: Contact;
  summary: string;            // 2-3 sentences, ~100 words, AI or manual
  skillGroups: SkillGroup[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
  certifications: Certification[];   // optional section, [] if none
  aiIntelligence: AiIntelligence;     // what the AI is allowed to use
  updatedAt: string;          // ISO date
}

// ===== Job pipeline =====

export interface GapAnalysis {
  score: number;                     // match % (matched / total * 100)
  matched: string[];                 // keywords you already have
  missing: string[];                 // keywords the job wants, you lack
  notes: Record<string, string>;     // keyword -> user context ("used in capstone")
  added: string[];                   // missing keywords user forced in anyway
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
  analysis: GapAnalysis;       // always set — computed on `cv` at creation
  /** true = AI generated/edited this CV; false = mock/fallback ran.
   *  Optional on old localStorage data; normalized to false on load. */
  aiUsed?: boolean;
}
