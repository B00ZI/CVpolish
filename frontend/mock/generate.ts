import type {
  AiIntelligence,
  GapAnalysis,
  Job,
  Language,
  MasterProfile,
  RewriteDiff,
} from "@/lib/types";

// FAKE "AI" for the mock phase — instant, local, obviously template-driven.
// Real generation arrives with the backend (step 4).

/** Fake gap analysis: matches master keywords found in the JD text. */
export function mockAnalyze(
  job: Pick<Job, "title" | "description">,
  profile: MasterProfile,
): GapAnalysis {
  const text = job.description.toLowerCase();
  const kws = profile.aiIntelligence.masterKeywords;
  const matched = kws.filter((k) =>
    text.includes(k.toLowerCase()),
  );
  const commonGaps = ["GraphQL", "Jest", "Playwright", "Storybook", "Kubernetes"];
  const missing = commonGaps
    .filter((k) => !text.includes(k.toLowerCase()))
    .slice(0, 3);
  const total = matched.length + missing.length || 1;
  return {
    score: Math.round((matched.length / total) * 100),
    matched,
    missing,
    notes: {},
    added: [],
  };
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

/** Fake rewrites: template-generated from the profile + job. */
export function mockRewrites(job: Job, profile: MasterProfile): RewriteDiff[] {
  const diffs: RewriteDiff[] = [];
  const fr = job.language === "fr";

  diffs.push({
    id: `rw-summary-${job.id}`,
    section: "summary",
    refId: "",
    original: profile.summary,
    rewritten: fr
      ? `${profile.contact.targetTitle} — profil orienté ${job.title}. ${profile.summary}`
      : `${profile.contact.targetTitle} focused on ${job.title} work — ${profile.summary}`,
    accepted: null,
  });

  const keywords = job.analysis?.matched.slice(0, 3).join(", ");

  profile.experience.slice(0, 2).forEach((exp) => {
    const bullet = exp.bullets[0];
    if (bullet) {
      diffs.push({
        id: `rw-${exp.id}-${job.id}`,
        section: "experience",
        refId: exp.id,
        original: bullet,
        rewritten: keywords
          ? fr
            ? `${bullet} — appuyé par : ${keywords}`
            : `${bullet} — applied ${keywords}`
          : bullet,
        accepted: null,
      });
    }
  });

  const project = profile.projects[0];
  if (project?.bullets[0]) {
    diffs.push({
      id: `rw-${project.id}-${job.id}`,
      section: "projects",
      refId: project.id,
      original: project.bullets[0],
      rewritten: keywords
        ? fr
          ? `${project.bullets[0]} — adossé à : ${keywords}`
          : `${project.bullets[0]} — backed by ${keywords}`
        : project.bullets[0],
      accepted: null,
    });
  }

  return diffs;
}
