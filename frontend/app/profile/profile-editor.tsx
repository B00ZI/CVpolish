"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MasterProfile } from "@/lib/types";
import { profileCompleteness } from "@/lib/completeness";
import {
  clearProfile,
  emptyProfile,
  extractIntelligence,
  loadProfile,
  saveProfile,
} from "@/lib/profile-store";
import { errMsg } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackLink, TopBar } from "@/components/top-bar";
import {
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  AiIntelligenceSection,
  ProjectsSection,
  SkillsSection,
  SummarySection,
} from "./profile-sections";

const SECTIONS = [
  { id: "contact", label: "Contact" },
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Technical skills" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certifications" },
  { id: "ai-intelligence", label: "AI intelligence" },
] as const;

export type Update = (fn: (p: MasterProfile) => MasterProfile) => void;

export function ProfileEditor() {
  const [profile, setProfile] = useState<MasterProfile>(emptyProfile);
  const [active, setActive] = useState<string>("contact");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const loaded = useRef(false);
  const firstSave = useRef(true);

  // Load the profile after mount (avoids hydration mismatch).
  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        loaded.current = true;
      })
      .catch((e) => {
        if (!alive) return;
        loaded.current = true;
        toast.error("Can't reach the backend", { description: errMsg(e) });
      });
    return () => {
      alive = false;
    };
  }, []);

  // Autosave: debounced PUT of the whole profile.
  useEffect(() => {
    if (!loaded.current) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      saveProfile(profile).catch((e) =>
        toast.error("Couldn't save your profile", { description: errMsg(e) }),
      );
    }, 500);
    return () => clearTimeout(t);
  }, [profile]);

  // Scroll-spy for the side nav.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -55% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const update: Update = (fn) => setProfile((p) => fn(p));

  // Summary rewrite has no backend endpoint yet — stay honest instead of
  // faking a spinner (AI is never required).
  async function runAi() {
    toast("Not wired yet", {
      description:
        "Summary rewriting is the next AI feature. Edit it by hand for now — it still feeds every generated CV.",
    });
  }

  const completeness = profileCompleteness(profile);

  async function reset() {
    try {
      const fresh = await clearProfile();
      setProfile(fresh);
      toast("Reset", { description: "Profile cleared." });
    } catch (e) {
      toast.error("Reset failed", { description: errMsg(e) });
    }
  }

  async function extract() {
    setAiBusy("intelligence");
    try {
      // Flush pending edits first — extraction reads the SAVED profile.
      await saveProfile(profile);
      const r = await extractIntelligence();
      // The server usually saved the result already; adopt it. Guard: a
      // fallback on a never-saved profile returns empty data without
      // saving — never wipe local keywords with that.
      if (r.aiUsed || r.data.masterKeywords.length > 0) {
        update((p) => ({ ...p, aiIntelligence: r.data }));
      }
      if (r.aiUsed) {
        toast.success("Keywords extracted by AI", {
          description: `${r.data.masterKeywords.length} keywords saved to your profile.`,
        });
      } else {
        toast.error("No AI — keywords kept", {
          description:
            "Your current keywords stay as they are. Try again in a moment.",
        });
      }
    } catch (e) {
      toast.error("Extraction failed", { description: errMsg(e) });
    } finally {
      setAiBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <TopBar
        left={
          <>
            <BackLink href="/">Home</BackLink>
            <span className="text-sm font-medium">Profile</span>
          </>
        }
        right={
          <>
            <Button variant="ghost" size="sm" className="text-xs" onClick={reset}>
              Reset data
            </Button>
            <ThemeToggle />
          </>
        }
      />

      {/* Mobile section nav */}
      <nav className="no-scrollbar sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-4 py-2 backdrop-blur md:hidden">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors",
              active === s.id
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mx-auto flex max-w-5xl gap-12 px-6 pb-24 pt-10">
        {/* Sticky side nav */}
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-24 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Profile complete</p>
              <p className="mt-1 text-2xl font-medium tracking-tight">
                {completeness}%
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
            <div className="space-y-0.5 border-t border-border pt-4">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition-colors",
                    active === s.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        {/* Form */}
        <main className="min-w-0 flex-1 md:max-w-2xl">
          <header className="mb-2">
            <h1 className="text-2xl font-medium tracking-tight">
              Your CV database
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Everything here feeds every tailored CV. One profile — the AI
              translates a finished CV to French when you need it.
            </p>
          </header>

          <ContactSection profile={profile} update={update} />
          <SummarySection
            profile={profile}
            update={update}
            busy={false}
            onAi={runAi}
          />
          <SkillsSection profile={profile} update={update} />
          <ExperienceSection profile={profile} update={update} />
          <ProjectsSection profile={profile} update={update} />
          <EducationSection profile={profile} update={update} />
          <CertificationsSection profile={profile} update={update} />
          <AiIntelligenceSection
            profile={profile}
            update={update}
            busy={aiBusy === "intelligence"}
            onExtract={extract}
          />

          <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
            Autosaves to your profile — every change is stored a moment after
            you stop typing.
          </footer>
        </main>
      </div>
    </div>
  );
}
