"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Job, MasterProfile } from "@/lib/types";

function fmtRange(start: string, end?: string | null): string {
  return `${start} — ${end ?? "Present"}`;
}

/** Apply accepted rewrites on top of the master profile. */
function tailor(profile: MasterProfile, job: Job) {
  const accepted = job.rewrites.filter((r) => r.accepted === true);

  const summaryDiff = accepted.find((r) => r.section === "summary");
  const summary = summaryDiff ? summaryDiff.rewritten : profile.summary;

  const experience = profile.experience.map((exp) => {
    const reps = accepted.filter(
      (r) => r.section === "experience" && r.refId === exp.id,
    );
    return {
      ...exp,
      bullets: exp.bullets.map(
        (b) => reps.find((r) => r.original === b)?.rewritten ?? b,
      ),
    };
  });

  const projects = profile.projects.map((prj) => {
    const reps = accepted.filter(
      (r) => r.section === "projects" && r.refId === prj.id,
    );
    return {
      ...prj,
      bullets: prj.bullets.map(
        (b) => reps.find((r) => r.original === b)?.rewritten ?? b,
      ),
    };
  });

  return { summary, experience, projects };
}

export function CvPreview({
  profile,
  job,
  onPrint,
}: {
  profile: MasterProfile;
  job: Job;
  onPrint: () => void;
}) {
  const { summary, experience, projects } = tailor(profile, job);
  const c = profile.contact;
  const contactLine = [c.phone, c.email, c.city]
    .filter(Boolean)
    .join("  ·  ");
  const linksLine = [c.github, c.linkedin, c.portfolio]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div>
      {/* Toolbar — hidden on paper */}
      <div className="mb-4 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">
          Exactly what gets printed.
        </p>
        <Button onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      {/* A4 sheet */}
      <article
        id="cv-preview"
        className="mx-auto rounded-lg border border-border bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        {/* Name block */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            {c.fullName}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            {c.targetTitle}
          </p>
          {contactLine && (
            <p className="mt-2 text-xs text-neutral-500">{contactLine}</p>
          )}
          {linksLine && (
            <p className="text-xs break-all text-neutral-500">{linksLine}</p>
          )}
        </header>

        {/* Summary */}
        {summary && (
          <Section title="Summary">
            <p>{summary}</p>
          </Section>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <Section title="Experience">
            <ul className="space-y-4">
              {experience.map((exp) => (
                <li key={exp.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium">
                      {exp.jobTitle}
                      <span className="font-normal text-neutral-600">
                        {" "}
                        — {exp.company}
                        {exp.location ? `, ${exp.location}` : ""}
                      </span>
                    </p>
                    <p className="shrink-0 text-xs text-neutral-500">
                      {fmtRange(exp.startDate, exp.endDate)}
                    </p>
                  </div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {exp.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <Section title="Projects">
            <ul className="space-y-3.5">
              {projects.map((prj) => (
                <li key={prj.id}>
                  <p className="font-medium">
                    {prj.name}
                    {prj.links.map((l) => (
                      <span
                        key={l.url}
                        className="ml-2 font-normal text-xs text-neutral-500"
                      >
                        {l.label}: {l.url}
                      </span>
                    ))}
                  </p>
                  <p className="text-neutral-700">{prj.description}</p>
                  {prj.techStack.length > 0 && (
                    <p className="text-xs text-neutral-500">
                      {prj.techStack.join(" · ")}
                    </p>
                  )}
                  <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                    {prj.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Skills */}
        {profile.skillGroups.length > 0 && (
          <Section title="Skills">
            <ul className="space-y-0.5">
              {profile.skillGroups.map((g) => (
                <li key={g.id}>
                  <span className="font-medium">{g.category}: </span>
                  {g.skills.join(", ")}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <Section title="Education">
            <ul className="space-y-1">
              {profile.education.map((ed) => (
                <li
                  key={ed.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <p>
                    <span className="font-medium">{ed.degree}</span>
                    {ed.major ? ` in ${ed.major}` : ""}, {ed.university}
                    {ed.location ? ` (${ed.location})` : ""}
                  </p>
                  <p className="shrink-0 text-xs text-neutral-500">
                    Class of {ed.graduationYear}
                  </p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Certifications */}
        {profile.certifications && profile.certifications.length > 0 && (
          <Section title="Certifications">
            <ul className="space-y-0.5">
              {profile.certifications.map((cert, i) => (
                <li key={i}>
                  <span className="font-medium">{cert.name}</span>
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                  {cert.year ? ` (${cert.year})` : ""}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 border-b border-neutral-300 pb-0.5 text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
