import { useState, type ReactNode } from "react";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MasterProfile } from "@/lib/types";
import type { Update } from "./profile-editor";

// ===== Shared building blocks =====

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-t border-border py-10 first:border-t-0 first:pt-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1.5 text-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function AddInput({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  function commit() {
    const v = value.trim();
    if (v) {
      onAdd(v);
      setValue("");
    }
  }
  return (
    <Input
      value={value}
      placeholder={placeholder}
      className="h-8 w-52 text-sm"
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
    />
  );
}

function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function AddBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Plus className="h-3.5 w-3.5" />
      {children}
    </Button>
  );
}

export function AiButton({
  busy,
  onClick,
  children,
}: {
  busy: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={onClick}
      className="gap-1.5"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
      )}
      {children}
    </Button>
  );
}

function CardBox({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      {onRemove ? (
        <div className="-mr-2 -mt-2 mb-4 flex justify-end">
          <RemoveBtn onClick={onRemove} label="Remove entry" />
        </div>
      ) : null}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ===== 1. Contact =====

export function ContactSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  const c = profile.contact;
  const set = (key: keyof typeof c, value: string) =>
    update((p) => ({ ...p, contact: { ...p.contact, [key]: value } }));

  return (
    <Section id="contact" title="Contact" hint="How recruiters reach you">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={c.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Target job title">
          <Input value={c.targetTitle} onChange={(e) => set("targetTitle", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={c.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input value={c.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="City, country">
          <Input value={c.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="GitHub">
          <Input value={c.github ?? ""} onChange={(e) => set("github", e.target.value)} />
        </Field>
        <Field label="LinkedIn">
          <Input value={c.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} />
        </Field>
        <Field label="Portfolio">
          <Input value={c.portfolio ?? ""} onChange={(e) => set("portfolio", e.target.value)} />
        </Field>
      </div>
    </Section>
  );
}

// ===== 2. Summary =====

export function SummarySection({
  profile,
  update,
  busy,
  onAi,
}: {
  profile: MasterProfile;
  update: Update;
  busy: boolean;
  onAi: () => void;
}) {
  const words = profile.summary.trim()
    ? profile.summary.trim().split(/\s+/).length
    : 0;

  return (
    <Section id="summary" title="Professional summary" hint="~100 words">
      <Textarea
        rows={5}
        value={profile.summary}
        placeholder="2–3 sentences: your stack, years of experience, the value you deliver."
        onChange={(e) => update((p) => ({ ...p, summary: e.target.value }))}
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {words} words · aim for 80–120
        </p>
        <AiButton busy={busy} onClick={onAi}>
          Generate summary
        </AiButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: this gets rewritten per job later — a solid base version is enough
        here.
      </p>
    </Section>
  );
}

// ===== 3. Technical skills =====

export function SkillsSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  return (
    <Section
      id="skills"
      title="Technical skills"
      hint="Only what you can defend in an interview"
    >
      {profile.skillGroups.map((group) => (
        <div key={group.id} className="rounded-xl border border-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{group.category}</span>
            <RemoveBtn
              label={`Remove ${group.category}`}
              onClick={() =>
                update((p) => ({
                  ...p,
                  skillGroups: p.skillGroups.filter((g) => g.id !== group.id),
                }))
              }
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.skills.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                onRemove={() =>
                  update((p) => ({
                    ...p,
                    skillGroups: p.skillGroups.map((g) =>
                      g.id === group.id
                        ? { ...g, skills: g.skills.filter((s) => s !== skill) }
                        : g,
                    ),
                  }))
                }
              />
            ))}
          </div>
          <div className="mt-3">
            <AddInput
              placeholder="Add skill + Enter"
              onAdd={(v) =>
                update((p) => ({
                  ...p,
                  skillGroups: p.skillGroups.map((g) =>
                    g.id === group.id ? { ...g, skills: [...g.skills, v] } : g,
                  ),
                }))
              }
            />
          </div>
        </div>
      ))}
      <AddBtn
        onClick={() =>
          update((p) => ({
            ...p,
            skillGroups: [
              ...p.skillGroups,
              { id: `sg-${Date.now()}`, category: "New category", skills: [] },
            ],
          }))
        }
      >
        Add category
      </AddBtn>
    </Section>
  );
}

// ===== 4. Experience =====

export function ExperienceSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  return (
    <Section
      id="experience"
      title="Work experience"
      hint="Newest first · numbers beat task lists"
    >
      {profile.experience.map((exp, i) => (
        <CardBox
          key={exp.id}
          onRemove={
            profile.experience.length > 0
              ? () =>
                  update((p) => ({
                    ...p,
                    experience: p.experience.filter((e) => e.id !== exp.id),
                  }))
              : undefined
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title">
              <Input
                value={exp.jobTitle}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    experience: p.experience.map((x, j) =>
                      j === i ? { ...x, jobTitle: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Company">
              <Input
                value={exp.company}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    experience: p.experience.map((x, j) =>
                      j === i ? { ...x, company: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Location">
              <Input
                value={exp.location}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    experience: p.experience.map((x, j) =>
                      j === i ? { ...x, location: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <Input
                  placeholder="Feb 2023"
                  value={exp.startDate}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      experience: p.experience.map((x, j) =>
                        j === i ? { ...x, startDate: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="End (blank = present)">
                <Input
                  placeholder="Present"
                  value={exp.endDate ?? ""}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      experience: p.experience.map((x, j) =>
                        j === i
                          ? { ...x, endDate: e.target.value || null }
                          : x,
                      ),
                    }))
                  }
                />
              </Field>
            </div>
          </div>
          <Field label="Impact bullets — one per line">
            <Textarea
              rows={4}
              value={exp.bullets.join("\n")}
              placeholder="Cut API response time by 40% by optimizing SQL queries…"
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  experience: p.experience.map((x, j) =>
                    j === i ? { ...x, bullets: e.target.value.split("\n") } : x,
                  ),
                }))
              }
            />
          </Field>
        </CardBox>
      ))}
      <AddBtn
        onClick={() =>
          update((p) => ({
            ...p,
            experience: [
              ...p.experience,
              {
                id: `exp-${Date.now()}`,
                jobTitle: "",
                company: "",
                location: "",
                startDate: "",
                endDate: null,
                bullets: [""],
              },
            ],
          }))
        }
      >
        Add experience
      </AddBtn>
    </Section>
  );
}

// ===== 5. Projects =====

export function ProjectsSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  return (
    <Section
      id="projects"
      title="Projects"
      hint="Real working apps — not to-do lists"
    >
      {profile.projects.map((prj, i) => (
        <CardBox
          key={prj.id}
          onRemove={() =>
            update((p) => ({
              ...p,
              projects: p.projects.filter((x) => x.id !== prj.id),
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={prj.name}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    projects: p.projects.map((x, j) =>
                      j === i ? { ...x, name: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Live / repo links — URL">
              <Input
                value={prj.links[0]?.url ?? ""}
                placeholder="https://…"
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    projects: p.projects.map((x, j) => {
                      if (j !== i) return x;
                      const links = [...x.links];
                      if (links[0]) links[0] = { ...links[0], url: e.target.value };
                      else links[0] = { label: "Live", url: e.target.value };
                      return { ...x, links };
                    }),
                  }))
                }
              />
            </Field>
          </div>
          <Field label="What it does">
            <Textarea
              rows={2}
              value={prj.description}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  projects: p.projects.map((x, j) =>
                    j === i ? { ...x, description: e.target.value } : x,
                  ),
                }))
              }
            />
          </Field>
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">Tech stack</span>
            <div className="flex flex-wrap gap-2">
              {prj.techStack.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  onRemove={() =>
                    update((p) => ({
                      ...p,
                      projects: p.projects.map((x, j) =>
                        j === i
                          ? { ...x, techStack: x.techStack.filter((s) => s !== t) }
                          : x,
                      ),
                    }))
                  }
                />
              ))}
            </div>
            <AddInput
              placeholder="Add tech + Enter"
              onAdd={(v) =>
                update((p) => ({
                  ...p,
                  projects: p.projects.map((x, j) =>
                    j === i ? { ...x, techStack: [...x.techStack, v] } : x,
                  ),
                }))
              }
            />
          </div>
          <Field label="Highlights — one per line">
            <Textarea
              rows={3}
              value={prj.bullets.join("\n")}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  projects: p.projects.map((x, j) =>
                    j === i ? { ...x, bullets: e.target.value.split("\n") } : x,
                  ),
                }))
              }
            />
          </Field>
        </CardBox>
      ))}
      <AddBtn
        onClick={() =>
          update((p) => ({
            ...p,
            projects: [
              ...p.projects,
              {
                id: `prj-${Date.now()}`,
                name: "",
                description: "",
                techStack: [],
                links: [],
                bullets: [""],
              },
            ],
          }))
        }
      >
        Add project
      </AddBtn>
    </Section>
  );
}

// ===== 6. Education =====

export function EducationSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  return (
    <Section
      id="education"
      title="Education"
      hint="Coursework helps early in your career"
    >
      {profile.education.map((edu, i) => (
        <CardBox
          key={edu.id}
          onRemove={() =>
            update((p) => ({
              ...p,
              education: p.education.filter((x) => x.id !== edu.id),
            }))
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Degree">
              <Input
                value={edu.degree}
                placeholder="BSc Computer Science"
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    education: p.education.map((x, j) =>
                      j === i ? { ...x, degree: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Major">
              <Input
                value={edu.major ?? ""}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    education: p.education.map((x, j) =>
                      j === i ? { ...x, major: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="University">
              <Input
                value={edu.university}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    education: p.education.map((x, j) =>
                      j === i ? { ...x, university: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
            <Field label="Graduation year">
              <Input
                value={edu.graduationYear}
                onChange={(e) =>
                  update((p) => ({
                    ...p,
                    education: p.education.map((x, j) =>
                      j === i ? { ...x, graduationYear: e.target.value } : x,
                    ),
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Coursework / capstone — one per line (optional)">
            <Textarea
              rows={3}
              value={(edu.coursework ?? []).join("\n")}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  education: p.education.map((x, j) =>
                    j === i
                      ? { ...x, coursework: e.target.value.split("\n") }
                      : x,
                  ),
                }))
              }
            />
          </Field>
        </CardBox>
      ))}
      <AddBtn
        onClick={() =>
          update((p) => ({
            ...p,
            education: [
              ...p.education,
              {
                id: `edu-${Date.now()}`,
                degree: "",
                major: "",
                university: "",
                graduationYear: "",
                coursework: [],
              },
            ],
          }))
        }
      >
        Add education
      </AddBtn>
    </Section>
  );
}

// ===== 7. Certifications (optional) =====

export function CertificationsSection({
  profile,
  update,
}: {
  profile: MasterProfile;
  update: Update;
}) {
  return (
    <Section
      id="certifications"
      title="Certifications"
      hint="Optional — skip if you have none"
    >
      {profile.certifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Nothing here yet — and that&apos;s fine. This section stays hidden on
          your CV until you add something.
        </div>
      ) : (
        profile.certifications.map((cert, i) => (
          <CardBox
            key={cert.id}
            onRemove={() =>
              update((p) => ({
                ...p,
                certifications: p.certifications.filter((x) => x.id !== cert.id),
              }))
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name">
                <Input
                  value={cert.name}
                  placeholder="AWS Certified Cloud Practitioner"
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      certifications: p.certifications.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Issuer">
                <Input
                  value={cert.issuer}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      certifications: p.certifications.map((x, j) =>
                        j === i ? { ...x, issuer: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Year">
                <Input
                  value={cert.year}
                  onChange={(e) =>
                    update((p) => ({
                      ...p,
                      certifications: p.certifications.map((x, j) =>
                        j === i ? { ...x, year: e.target.value } : x,
                      ),
                    }))
                  }
                />
              </Field>
            </div>
          </CardBox>
        ))
      )}
      <AddBtn
        onClick={() =>
          update((p) => ({
            ...p,
            certifications: [
              ...p.certifications,
              { id: `cert-${Date.now()}`, name: "", issuer: "", year: "" },
            ],
          }))
        }
      >
        Add certification
      </AddBtn>
    </Section>
  );
}

// ===== 8. Keywords =====

export function KeywordsSection({
  profile,
  update,
  busy,
  onAi,
}: {
  profile: MasterProfile;
  update: Update;
  busy: boolean;
  onAi: () => void;
}) {
  return (
    <Section
      id="keywords"
      title="Master keywords"
      hint="Job matching compares against this list"
    >
      <div className="flex flex-wrap gap-2">
        {profile.keywords.map((kw) => (
          <Chip
            key={kw}
            label={kw}
            onRemove={() =>
              update((p) => ({
                ...p,
                keywords: p.keywords.filter((k) => k !== kw),
              }))
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AddInput
          placeholder="Add keyword + Enter"
          onAdd={(v) =>
            update((p) => ({ ...p, keywords: [...p.keywords, v] }))
          }
        />
        <AiButton busy={busy} onClick={onAi}>
          Extract keywords
        </AiButton>
      </div>
      <p className={cn("text-xs text-muted-foreground")}>
        AI reads your data above and keeps this list sharp — you can always
        edit it by hand.
      </p>
    </Section>
  );
}
