"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job, Language, MasterProfile } from "@/lib/types";

// CV template labels per language. The CV content itself comes from the
// profile db in that language; these are just the fixed template strings.
const LABELS: Record<
  Language,
  {
    summary: string;
    experience: string;
    projects: string;
    skills: string;
    education: string;
    certifications: string;
    present: string;
    graduated: string;
    addBullet: string;
    ph: { jobTitle: string; company: string; location: string; dates: string; bullet: string };
  }
> = {
  en: {
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    skills: "Skills",
    education: "Education",
    certifications: "Certifications",
    present: "Present",
    graduated: "Class of",
    addBullet: "Add bullet",
    ph: {
      jobTitle: "Job title",
      company: "Company",
      location: "City",
      dates: "Dates",
      bullet: "Bullet",
    },
  },
  fr: {
    summary: "Profil",
    experience: "Expérience professionnelle",
    projects: "Projets",
    skills: "Compétences",
    education: "Formation",
    certifications: "Certifications",
    present: "Présent",
    graduated: "Diplômé en",
    addBullet: "Ajouter une ligne",
    ph: {
      jobTitle: "Intitulé du poste",
      company: "Entreprise",
      location: "Ville",
      dates: "Période",
      bullet: "Accomplissement",
    },
  },
};

function fmtRange(start: string, end: string | null, present: string): string {
  return `${start} — ${end ?? present}`;
}

/** Click-to-edit text: renders as plain text until clicked, then a small
 *  textarea. Enter or blur saves, Escape cancels. Writes go through onSave
 *  (the parent persists them to the profile store). Empty values render as
 *  a clickable ghost placeholder so new entries stay editable in place. */
function Editable({
  value,
  onSave,
  className,
  placeholder = "…",
  block = false,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
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

  if (value === "") {
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
          "cursor-text rounded-sm text-neutral-400 transition-colors hover:bg-neutral-100 print:hidden dark:hover:bg-white/10",
          block && "block",
          className,
        )}
      >
        {placeholder}
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

/** Inline "add" affordance (same editing UX as Editable): hidden until
 *  its section is hovered or flashed amber; then opens an empty textarea.
 *  Enter or blur saves, empty text is discarded, Escape cancels.
 *  Positioned by the caller inside a reserved gap, so showing it never
 *  pushes the CV content around. */
function AddRow({
  label,
  onAdd,
  className,
}: {
  label: string;
  onAdd: (v: string) => void;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const skipBlur = useRef(false);

  function commit() {
    const v = draft.trim();
    if (v) onAdd(v);
    skipBlur.current = true;
    setAdding(false);
  }

  if (adding) {
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
            setAdding(false);
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        rows={2}
        className="w-full resize-none rounded-sm bg-white p-0.5 text-neutral-900 ring-2 ring-blue-600 outline-hidden [font-family:inherit] [font-size:inherit]"
      />
    );
  }

  return (
    <button
      type="button"
      title={label}
      onClick={() => {
        setDraft("");
        skipBlur.current = false;
        setAdding(true);
      }}
      className={cn(
        "cv-add-row cursor-text items-center gap-1 text-[12px] text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300",
        className,
      )}
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}

export function CvPreview({
  profile,
  job,
  onEditProfile,
}: {
  profile: MasterProfile;
  job: Job;
  /** Persist an edit to the master profile. */
  onEditProfile: (fn: (p: MasterProfile) => MasterProfile) => void;
}) {
  const L = LABELS[job.language];
  const c = profile.contact;
  const contactLine = [c.phone, c.email, c.city]
    .filter(Boolean)
    .join("  ·  ");
  const linksLine = [c.github, c.linkedin, c.portfolio]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div>
      {/* A4 sheet — hint + print button live in the left panel */}
      <article
        id="cv-preview"
        className="mx-auto rounded-lg border border-border bg-white p-10 text-[13px] leading-relaxed font-[450] text-neutral-900 shadow-sm print:rounded-none print:border-0 print:p-[8mm_10mm] print:shadow-none"
      >
        {/* Name block — centered */}
        <header className="text-center">
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
            <p className="mt-2 text-xs text-neutral-600">{contactLine}</p>
          )}
          {linksLine && (
            <p className="text-xs break-all text-neutral-600">{linksLine}</p>
          )}
        </header>

        {/* Summary — navigation target for missing-keyword editing */}
        {profile.summary && (
          <Section title={L.summary} targetId="summary">
            <p>
              <Editable
                block
                value={profile.summary}
                onSave={(v) => onEditProfile((p) => ({ ...p, summary: v }))}
              />
            </p>
          </Section>
        )}

        {/* Skills — right after Summary so keywords land early */}
        {profile.skillGroups.length > 0 && (
          <Section title={L.skills}>
            <ul className="space-y-0.5">
              {profile.skillGroups.map((g) => (
                <li key={g.id}>
                  <span className="font-semibold">{g.category}: </span>
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

        {/* Experience */}
        {profile.experience.length > 0 && (
          <Section title={L.experience}>
            <ul className="space-y-4">
              {profile.experience.map((exp) => (
                <li key={exp.id} data-cv-target={exp.id}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold">
                      {exp.jobTitle}
                      <span className="font-normal text-neutral-700">
                        {" "}
                        — {exp.company}
                        {exp.location ? `, ${exp.location}` : ""}
                      </span>
                    </p>
                    <p className="shrink-0 text-xs text-neutral-600">
                      {fmtRange(exp.startDate, exp.endDate, L.present)}
                    </p>
                  </div>
                  <div className="relative mt-1">
                    <ul className="list-disc space-y-0.5 pl-5 leading-snug pb-7 print:pb-0">
                      {exp.bullets.map((b, i) => (
                        <li key={i}>
                          <Editable
                            block
                            value={b}
                            placeholder={L.ph.bullet}
                            onSave={(v) =>
                              onEditProfile((p) => ({
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
                    <AddRow
                      label={L.addBullet}
                      className="absolute bottom-1 left-5"
                      onAdd={(v) =>
                        onEditProfile((p) => ({
                          ...p,
                          experience: p.experience.map((e) =>
                            e.id === exp.id
                              ? { ...e, bullets: [...e.bullets, v] }
                              : e,
                          ),
                        }))
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Projects */}
        {profile.projects.length > 0 && (
          <Section title={L.projects}>
            <ul className="space-y-4">
              {profile.projects.map((prj) => (
                <li key={prj.id} data-cv-target={prj.id}>
                  <p className="font-semibold leading-snug">
                    {prj.name}
                    {prj.links.map((l) => (
                      <span
                        key={l.url}
                        className="ml-2 font-normal text-xs text-neutral-600"
                      >
                        {l.label}: {l.url}
                      </span>
                    ))}
                  </p>
                  {prj.techStack.length > 0 && (
                    <p className="leading-snug text-neutral-700">
                      {prj.techStack.join(", ")}
                    </p>
                  )}
                  <div className="relative mt-1">
                    <ul className="list-disc space-y-0.5 pl-5 leading-snug pb-7 print:pb-0">
                      {prj.bullets.map((b, i) => (
                        <li key={i}>
                          <Editable
                            block
                            value={b}
                            placeholder={L.ph.bullet}
                            onSave={(v) =>
                              onEditProfile((p) => ({
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
                    <AddRow
                      label={L.addBullet}
                      className="absolute bottom-1 left-5"
                      onAdd={(v) =>
                        onEditProfile((p) => ({
                          ...p,
                          projects: p.projects.map((pr) =>
                            pr.id === prj.id
                              ? { ...pr, bullets: [...pr.bullets, v] }
                              : pr,
                          ),
                        }))
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <Section title={L.education}>
            <ul className="space-y-1">
              {profile.education.map((ed) => (
                <li
                  key={ed.id}
                  className="flex items-baseline justify-between gap-4"
                >
                  <p>
                    <Editable
                      className="font-semibold"
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
                  <p className="shrink-0 text-xs text-neutral-600">
                    {L.graduated}{" "}
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
          <Section title={L.certifications}>
            <ul className="space-y-0.5">
              {profile.certifications.map((cert, i) => (
                <li key={i}>
                  <Editable
                    className="font-semibold"
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
  targetId,
  children,
}: {
  title: string;
  targetId?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6" data-cv-target={targetId}>
      <h2 className="mb-2 border-b border-neutral-300 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-900">
        {title}
      </h2>
      {children}
    </section>
  );
}
