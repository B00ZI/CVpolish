"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MasterProfile } from "@/lib/types";
import { profileCompleteness } from "@/lib/completeness";
import { clearProfile, loadProfile, saveProfile } from "@/lib/profile-store";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockProfile, withDelay } from "@/mock";
import {
  CertificationsSection,
  ContactSection,
  EducationSection,
  ExperienceSection,
  KeywordsSection,
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
  { id: "keywords", label: "Keywords" },
] as const;

export type Update = (fn: (p: MasterProfile) => MasterProfile) => void;

export function ProfileEditor() {
  const [profile, setProfile] = useState<MasterProfile>(mockProfile);
  const [active, setActive] = useState<string>("contact");
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const loaded = useRef(false);
  const firstSave = useRef(true);

  // Load saved data after mount (avoids hydration mismatch).
  useEffect(() => {
    setProfile(loadProfile());
    loaded.current = true;
  }, []);

  // Autosave to localStorage (the fake backend for now).
  useEffect(() => {
    if (!loaded.current) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(() => {
      saveProfile(profile);
      setSaveState("saved");
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

  // Mock AI call — real one arrives with the backend (step 4).
  async function runAi(name: string) {
    setAiBusy(name);
    await withDelay(null, 1400);
    setAiBusy(null);
    toast("Mock AI", {
      description: "Real generation arrives once the backend is connected.",
    });
  }

  const completeness = profileCompleteness(profile);

  function reset() {
    try {
      clearProfile();
    } catch {
      // ignore
    }
    setProfile(mockProfile);
    toast("Reset", { description: "Back to the mock data." });
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <span className="text-sm font-medium">Profile</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  saveState === "saved" ? "bg-emerald-500" : "bg-amber-500",
                )}
              />
              {saveState === "saved" ? "Saved" : "Saving…"}
            </span>
            <Button variant="ghost" size="sm" className="text-xs" onClick={reset}>
              Reset data
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

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
              Everything here feeds every tailored CV. Fill it once, reuse it
              forever.
            </p>
          </header>

          <ContactSection profile={profile} update={update} />
          <SummarySection
            profile={profile}
            update={update}
            busy={aiBusy === "summary"}
            onAi={() => runAi("summary")}
          />
          <SkillsSection profile={profile} update={update} />
          <ExperienceSection profile={profile} update={update} />
          <ProjectsSection profile={profile} update={update} />
          <EducationSection profile={profile} update={update} />
          <CertificationsSection profile={profile} update={update} />
          <KeywordsSection
            profile={profile}
            update={update}
            busy={aiBusy === "keywords"}
            onAi={() => runAi("keywords")}
          />

          <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
            Saved in your browser for now — the real backend comes later.
          </footer>
        </main>
      </div>
    </div>
  );
}
