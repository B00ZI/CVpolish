"use client";

import { useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Job, MasterProfile } from "@/lib/types";

function fmtRange(start: string, end?: string | null): string {
  return `${start} — ${end ?? "Present"}`;
}

/** Click-to-edit text: renders as plain text until clicked, then a small
 *  textarea. Enter or blur saves, Escape cancels. Writes go through onSave
 *  (the parent persists them to the profile store). */
function Editable({
  value,
  onSave,
  className,
  block = false,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  block?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const skipBlur = useRef(false);

  function open() {
    setDraft(value);
    skipBlur.current = false;
    setEditing(true);
  }

  function commit() {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    skipBlur.current = true;
    setEditing(false);
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
        className={cn(
          "cursor-text rounded-sm transition-colors hover:bg-neutral-100 hover:outline hover:outline-1 hover:outline-neutral-300 dark:hover:bg-white/10 dark:hover:outline-white/25",
          className,
        )}
      >
        {value}
      </span>
    );
  }

  return (
    <textarea
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (skipBlur.current) return;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          skipBlur.current = true;
          setEditing(false);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
      }}
      rows={Math.min(6, Math.max(2, Math.ceil(draft.length / 60)))}
      className={cn(
        "w-full resize-none rounded-sm bg-white p-0.5 text-neutral-900 ring-2 ring-blue-600 outline-hidden [font-family:inherit] [font-size:inherit]",
        block ? "block" : "inline-block",
        className,
      )}
    />
  );
}

/** A line of text in the preview + where it came from (rewrite or profile). */
interface Displayed {
  text: string;
  rewriteId?: string;
}

/** Apply accepted rewrites on top of the master profile. */
function tailor(profile: MasterProfile, job: Job) {
  const accepted = job.rewrites.filter((r) => r.accepted === true);

  const summaryDiff = accepted.find((r) => r.section === "summary");
  const summary: Displayed = summaryDiff
    ? { text: summaryDiff.rewritten, rewriteId: summaryDiff.id }
    : { text: profile.summary };

  const experience = profile.experience.map((exp) => {
    const reps = accepted.filter(
      (r) => r.section === "experience" && r.refId === exp.id,
    );
    return {
      ...exp,
      bullets: exp.bullets.map((b): Displayed => {
        const rep = reps.find((r) => r.original === b);
        return rep
          ? { text: rep.rewritten, rewriteId: rep.id }
          : { text: b };
      }),
    };
  });

  const projects = profile.projects.map((prj) => {
    const reps = accepted.filter(
      (r) => r.section === "projects" && r.refId === prj.id,
    );
    return {
      ...prj,
      bullets: prj.bullets.map((b): Displayed => {
        const rep = reps.find((r) => r.original === b);
        return rep
          ? { text: rep.rewritten, rewriteId: rep.id }
          : { text: b };
      }),
    };
  });

  return { summary, experience, projects };
}

export function CvPreview({
  profile,
  job,
  onPrint,
  onEditProfile,
  onEditRewrite,
}: {
  profile: MasterProfile;
  job: Job;
  onPrint: () => void;
  /** Persist an edit to the master profile. */
  onEditProfile: (fn: (p: MasterProfile) => MasterProfile) => void;
  /** Persist an edit to an accepted rewrite (text shown came from it). */
  onEditRewrite: (rewriteId: string, text: string) => void;
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
          Click any text to edit your profile. Then print or save as PDF.
        </p>
        <Button onClick={onPrint}>
          <Printer className="h-4 w-4" />
          Print / Save as PDF
        </Button>
      </div>

      {/* A4 sheet */}
      <article
        id="cv-preview"
        className="mx-auto rounded-lg border border-border bg-white p-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-[8mm_10mm] print:shadow-none"
      >
        {/* Name block */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            <Editable
              value={c.fullName}
              onSave={(v) =>
                onEditProfile((p) => ({
                  ...p,
                  contact: { ...p.contact, fullName: v },
                }))
              }
            />
          </h1>
          <p className="mt-0.5 text-sm text-neutral-600">
            <Editable
              value={c.targetTitle}
              onSave={(v) =>
                onEditProfile((p) => ({
                  ...p,
                  contact: { ...p.contact, targetTitle: v },
                }))
              }
            />
          </p>
          {contactLine && (
            <p className="mt-2 text-xs text-neutral-500">{contactLine}</p>
          )}
          {linksLine && (
            <p className="text-xs break-all text-neutral-500">{linksLine}</p>
          )}
        </header>

        {/* Summary */}
        {summary.text && (
          <Section title="Summary">
            <p>
              <Editable
                block
                value={summary.text}
                onSave={(v) =>
                  summary.rewriteId
                    ? onEditRewrite(summary.rewriteId, v)
                    : onEditProfile((p) => ({ ...p, summary: v }))
                }
              />
            </p>
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
                      <li key={i}>
                        <Editable
                          block
                          value={b.text}
                          onSave={(v) =>
                            b.rewriteId
                              ? onEditRewrite(b.rewriteId, v)
                              : onEditProfile((p) => ({
                                  ...p,
                                  experience: p.experience.map((e) =>
                                    e.id === exp.id
                                      ? {
                                          ...e,
                                          bullets: e.bullets.map((eb, bi) =>
                                            bi === i ? v : eb,
                                          ),
                                        }
                                      : e,
                                  ),
                                }))
                          }
                        />
                      </li>
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
                      <li key={i}>
                        <Editable
                          block
                          value={b.text}
                          onSave={(v) =>
                            b.rewriteId
                              ? onEditRewrite(b.rewriteId, v)
                              : onEditProfile((p) => ({
                                  ...p,
                                  projects: p.projects.map((pr) =>
                                    pr.id === prj.id
                                      ? {
                                          ...pr,
                                          bullets: pr.bullets.map((pb, pi) =>
                                            pi === i ? v : pb,
                                          ),
                                        }
                                      : pr,
                                  ),
                                }))
                          }
                        />
                      </li>
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
                  <Editable
                    value={g.skills.join(", ")}
                    onSave={(v) =>
                      onEditProfile((p) => ({
                        ...p,
                        skillGroups: p.skillGroups.map((sg) =>
                          sg.id === g.id
                            ? {
                                ...sg,
                                skills: v
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }
                            : sg,
                        ),
                      }))
                    }
                  />
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
                    <Editable
                      className="font-medium"
                      value={ed.degree}
                      onSave={(v) =>
                        onEditProfile((p) => ({
                          ...p,
                          education: p.education.map((e2) =>
                            e2.id === ed.id ? { ...e2, degree: v } : e2,
                          ),
                        }))
                      }
                    />
                    {ed.major ? (
                      <>
                        {" in "}
                        <Editable
                          value={ed.major}
                          onSave={(v) =>
                            onEditProfile((p) => ({
                              ...p,
                              education: p.education.map((e2) =>
                                e2.id === ed.id ? { ...e2, major: v } : e2,
                              ),
                            }))
                          }
                        />
                      </>
                    ) : null}
                    {", "}
                    <Editable
                      value={ed.university}
                      onSave={(v) =>
                        onEditProfile((p) => ({
                          ...p,
                          education: p.education.map((e2) =>
                            e2.id === ed.id ? { ...e2, university: v } : e2,
                          ),
                        }))
                      }
                    />
                    {ed.location ? (
                      <>
                        {" ("}
                        <Editable
                          value={ed.location}
                          onSave={(v) =>
                            onEditProfile((p) => ({
                              ...p,
                              education: p.education.map((e2) =>
                                e2.id === ed.id ? { ...e2, location: v } : e2,
                              ),
                            }))
                          }
                        />
                        {")"}
                      </>
                    ) : null}
                  </p>
                  <p className="shrink-0 text-xs text-neutral-500">
                    Class of{" "}
                    <Editable
                      value={ed.graduationYear}
                      onSave={(v) =>
                        onEditProfile((p) => ({
                          ...p,
                          education: p.education.map((e2) =>
                            e2.id === ed.id
                              ? { ...e2, graduationYear: v }
                              : e2,
                          ),
                        }))
                      }
                    />
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
                  <Editable
                    className="font-medium"
                    value={cert.name}
                    onSave={(v) =>
                      onEditProfile((p) => ({
                        ...p,
                        certifications: p.certifications.map((c2, ci) =>
                          ci === i ? { ...c2, name: v } : c2,
                        ),
                      }))
                    }
                  />
                  {cert.issuer ? (
                    <>
                      {" — "}
                      <Editable
                        value={cert.issuer}
                        onSave={(v) =>
                          onEditProfile((p) => ({
                            ...p,
                            certifications: p.certifications.map((c2, ci) =>
                              ci === i ? { ...c2, issuer: v } : c2,
                            ),
                          }))
                        }
                      />
                    </>
                  ) : null}
                  {cert.year ? (
                    <>
                      {" ("}
                      <Editable
                        value={cert.year}
                        onSave={(v) =>
                          onEditProfile((p) => ({
                            ...p,
                            certifications: p.certifications.map((c2, ci) =>
                              ci === i ? { ...c2, year: v } : c2,
                            ),
                          }))
                        }
                      />
                      {")"}
                    </>
                  ) : null}
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
