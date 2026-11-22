// The frontend implementation of the Keyword scan contract (`backend/API.md` §4b).
// ONE rule, both sides: the backend's `cv_text()` / `score_keywords()` must
// mirror exactly this — if the contract ever changes, change both sides together.

import type { Keyword, MasterProfile } from "@/lib/types";

/** All text that is actually rendered on the CV — the scan runs on this. */
export function cvText(p: MasterProfile): string {
  const parts = [p.contact.fullName, p.contact.targetTitle, p.summary];
  for (const e of p.experience)
    parts.push(
      e.jobTitle,
      e.company,
      e.location,
      e.technologies.join(" "),
      e.bullets.join(" "),
    );
  for (const prj of p.projects)
    parts.push(
      prj.name,
      prj.techStack.join(" "),
      prj.description,
      prj.bullets.join(" "),
    );
  for (const g of p.skillGroups) parts.push(g.skills.join(" "));
  for (const ed of p.education)
    parts.push(ed.degree, ed.major ?? "", ed.university, ed.location ?? "");
  for (const cert of p.certifications) parts.push(cert.name, cert.issuer);
  return parts.join(" ").toLowerCase();
}

/** Rule 3 — word-boundary hit. Guards only where the needle edge is a word
 *  character, so "git" never matches "github", while "C++" / "C#" / ".net"
 *  / "Node.js" still match (their edges aren't word chars). `text` arrives
 *  lowercased from cvText(); the needle is trimmed + lowercased here. */
export function kwHit(text: string, needle: string): boolean {
  const t = needle.trim().toLowerCase();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern =
    (/[a-z0-9]/.test(t[0]) ? "(?<![a-z0-9])" : "") +
    escaped +
    (/[a-z0-9]/.test(t[t.length - 1]) ? "(?![a-z0-9])" : "");
  return new RegExp(pattern).test(text);
}

/** Rule 3 — the term OR any alias hitting counts as a match. */
export function keywordHit(text: string, kw: Keyword): boolean {
  if (kwHit(text, kw.term)) return true;
  return kw.aliases.some((a) => kwHit(text, a));
}

export interface ScanResult {
  /** required only: round(found / (found + missing) * 100); 0 if none required */
  score: number;
  found: Keyword[];           // required keywords present in the text
  missing: Keyword[];         // required keywords absent → red chips
  optionalMissing: Keyword[]; // optional keywords absent → orange chips (never scored)
}

/** Rules 4+5 — scan lowercased CV text against the job's keywords.
 *  The workspace runs this live on every edit; home cards get the same
 *  numbers computed server-side at read. Full Keyword objects come back so
 *  chips can highlight aliases too (counts/score use .length — same as the
 *  backend, which only ever returns term strings). */
export function analyzeKeywords(text: string, keywords: Keyword[]): ScanResult {
  const found: Keyword[] = [];
  const missing: Keyword[] = [];
  const optionalMissing: Keyword[] = [];
  for (const kw of keywords) {
    const hit = keywordHit(text, kw);
    if (kw.tier === "optional") {
      if (!hit) optionalMissing.push(kw);
    } else if (hit) {
      found.push(kw);
    } else {
      missing.push(kw);
    }
  }
  const total = found.length + missing.length;
  return {
    score: total ? Math.round((found.length / total) * 100) : 0,
    found,
    missing,
    optionalMissing,
  };
}
