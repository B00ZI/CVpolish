import type { MasterProfile } from "./types";

/** How complete is the CV database? 0–100. Certifications excluded (optional). */
export function profileCompleteness(profile: MasterProfile): number {
  const checks = [
    !!profile.contact.fullName,
    !!profile.contact.targetTitle,
    !!profile.contact.email,
    !!profile.contact.phone,
    !!profile.contact.city,
    !!profile.contact.github,
    !!profile.contact.linkedin,
    !!profile.contact.portfolio,
    profile.summary.trim().length > 0,
    profile.skillGroups.some((g) => g.skills.length > 0),
    profile.experience.length > 0,
    profile.projects.length > 0,
    profile.education.length > 0,
    profile.keywords.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
