import type {
  AiIntelligence,
  Job,
  Language,
  MasterProfile,
} from "@/lib/types";
import { analyzeForJob } from "@/lib/cv-text";

// FAKE "AI" for the mock phase — instant, local, obviously template-driven.
// Real generation arrives with the backend (step 4).

/** Fake gap analysis — delegated to the contract implementation in lib/cv-text. */
export function mockAnalyze(
  job: Pick<Job, "title" | "description">,
  profile: MasterProfile,
) {
  return analyzeForJob(job.description, profile);
}

/** Extract what the AI keeps from the profile: keywords + a baseline summary. */
export function mockExtractIntelligence(p: MasterProfile): AiIntelligence {
  const techs = new Set<string>();
  for (const g of p.skillGroups) g.skills.forEach((s) => techs.add(s));
  for (const e of p.experience) e.technologies.forEach((t) => techs.add(t));
  for (const prj of p.projects) prj.techStack.forEach((t) => techs.add(t));
  const list = [...techs].slice(0, 15);
  const last = p.experience[0];
  const projNames = p.projects.slice(0, 2).map((x) => x.name).filter(Boolean);
  const baseline =
    `${p.contact.targetTitle} with hands-on experience in ${list.slice(0, 6).join(", ")}` +
    (last ? ` — most recent: ${last.jobTitle}${last.company ? ` at ${last.company}` : ""}` : "") +
    (projNames.length ? `; shipped projects including ${projNames.join(" and ")}.` : ".");
  return {
    masterKeywords: list,
    baselineSummary: baseline,
    lastExtractedAt: new Date().toISOString(),
  };
}

/** Bulk AI auto-fit.
 *  Mock for the future POST /api/cv/integrate-missing: Gemini rewrites
 *  relevant bullets so missing keywords land naturally in the CV.
 *  Here: one tailored bullet per keyword, distributed over experiences. */
export function mockAutoFit(
  p: MasterProfile,
  keywords: string[],
  lang: Language,
): MasterProfile {
  const fr = lang === "fr";
  const bulletFor = (kw: string) =>
    fr
      ? `Intégration de ${kw} en conditions de production, avec un suivi d'impact mesurable.`
      : `Integrated ${kw} into production workflows, with measurable impact tracking.`;

  if (p.experience.length === 0) {
    // No experience to rewrite -> fall back to the skills db.
    const next: MasterProfile = { ...p };
    if (next.skillGroups.length > 0) {
      next.skillGroups = next.skillGroups.map((g, i) =>
        i === 0 ? { ...g, skills: [...g.skills, ...keywords] } : g,
      );
    }
    return next;
  }

  return {
    ...p,
    experience: p.experience.map((e, i) => ({
      ...e,
      bullets: [
        ...e.bullets,
        ...keywords.filter((_, j) => j % p.experience.length === i).map(
          (kw) => bulletFor(kw),
        ),
      ],
    })),
  };
}
