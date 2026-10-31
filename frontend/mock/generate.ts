import type { GapAnalysis, Job, MasterProfile, RewriteDiff } from "@/lib/types";

// FAKE "AI" for the mock phase — instant, local, obviously template-driven.
// Real generation arrives with the backend (step 4).

/** Fake gap analysis: matches profile keywords found in the JD text. */
export function mockAnalyze(
  job: Pick<Job, "title" | "description">,
  profile: MasterProfile,
): GapAnalysis {
  const text = job.description.toLowerCase();
  const matched = profile.keywords.filter((k) =>
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

/** Fake rewrites: template-generated from the profile + job. */
export function mockRewrites(job: Job, profile: MasterProfile): RewriteDiff[] {
  const diffs: RewriteDiff[] = [];

  diffs.push({
    id: `rw-summary-${job.id}`,
    section: "summary",
    refId: "",
    original: profile.summary,
    rewritten: `${profile.contact.targetTitle} focused on ${job.title} work — ${profile.summary}`,
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
        rewritten: keywords ? `${bullet} — applied ${keywords}` : bullet,
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
        ? `${project.bullets[0]} — backed by ${keywords}`
        : project.bullets[0],
      accepted: null,
    });
  }

  return diffs;
}
