// Types for the whole app.
// Shaped like the future FastAPI responses: when the backend exists,
// endpoints return exactly these JSON shapes and the swap from mock -> API is easy.

// The app keeps two profile databases (EN + FR); every CV targets one.
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
  keywords: string[];         // AI-extracted master keyword list
  updatedAt: string;          // ISO date
}

// ===== Job pipeline =====

export type JobStatus = "draft" | "analyzed" | "tailed";

export interface GapAnalysis {
  score: number;                     // match % (matched / total * 100)
  matched: string[];                 // keywords you already have
  missing: string[];                 // keywords the job wants, you lack
  notes: Record<string, string>;     // keyword -> user context ("used in capstone")
  added: string[];                   // missing keywords user forced in anyway
}

export interface RewriteDiff {
  id: string;
  section: "summary" | "experience" | "projects";
  refId: string;               // id of the experience/project ("" for summary)
  original: string;
  rewritten: string;
  accepted: boolean | null;    // null = not reviewed yet
}

export interface TailoredResult {
  summary: string;             // rewritten for this job
  experience: Experience[];    // rewritten bullets
  projects: Project[];
  generatedAt: string;         // ISO date
}

export interface Job {
  id: string;
  language: Language;          // which profile db the CV is built from
  title: string;               // job title
  company: string;
  location?: string;
  description: string;         // raw pasted job description
  createdAt: string;           // ISO date
  status: JobStatus;
  analysis: GapAnalysis | null;
  rewrites: RewriteDiff[];     // filled after the AI rewrite step
  tailored: TailoredResult | null;  // filled when user accepts rewrites
}
