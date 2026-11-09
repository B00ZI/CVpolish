// The frontend implementation of the Keyword scan contract (`backend/API.md` §4b).
// ONE rule, both sides: the backend's `cv_text()` / `analyze_for_job()` must
// mirror exactly this — if the contract ever changes, change both sides together.

import type { GapAnalysis, MasterProfile } from "@/lib/types";

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

/**
 * Creation-time analysis, exactly per the contract:
 * required = master keywords mentioned in the JD;
 * matched = required ones present in cv_text; missing = the rest.
 */
export function analyzeForJob(jdText: string, profile: MasterProfile): GapAnalysis {
  const jd = jdText.toLowerCase();
  const text = cvText(profile);
  const required = profile.aiIntelligence.masterKeywords.filter((k) =>
    jd.includes(k.toLowerCase()),
  );
  const matched = required.filter((k) => text.includes(k.toLowerCase()));
  const missing = required.filter((k) => !text.includes(k.toLowerCase()));
  const total = matched.length + missing.length || 1;
  return {
    score: Math.round((matched.length / total) * 100),
    matched,
    missing,
    notes: {},
    added: [],
  };
}
