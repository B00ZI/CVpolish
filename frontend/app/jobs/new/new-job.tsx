"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Job, Language } from "@/lib/types";
import { loadProfile } from "@/lib/profile-store";
import { upsertJob } from "@/lib/jobs-store";
import { mockAnalyze, withDelay } from "@/mock";
import { TopBar, BackLink } from "@/components/top-bar";
import { cn } from "@/lib/utils";

const LANGUAGES: {
  value: Language;
  label: string;
  hint: string;
}[] = [
  { value: "en", label: "English", hint: "Uses your English profile" },
  { value: "fr", label: "Français", hint: "Utilise ton profil français" },
];

export function NewJob() {
  const router = useRouter();
  const [lang, setLang] = useState<Language | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const canAnalyze = lang !== null && description.trim().length > 0;

  async function analyze() {
    if (!canAnalyze || busy || lang === null) return;
    setBusy(true);
    // Title = the first meaningful line of the JD (strip markdown headings).
    const firstLine =
      description
        .trim()
        .split("\n")
        .find((l) => l.trim()) ?? "";
    const title = firstLine.replace(/^#+\s*/, "").slice(0, 80);
    // The job owns a frozen copy of the profile at creation time:
    // AI edits stay in the job and later profile changes never touch it.
    const profile = loadProfile(lang);
    const job: Job = {
      id: `job-${Date.now()}`,
      language: lang,
      title,
      company: "",
      description,
      createdAt: new Date().toISOString(),
      status: "analyzed",
      cv: profile,
      analysis: null,
      rewrites: [],
      tailored: null,
    };
    job.analysis = mockAnalyze(job, profile);
    await withDelay(null, 1400);
    upsertJob(job);
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <TopBar left={<BackLink href="/">Your CVs</BackLink>} />

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        {lang === null ? (
          <>
            <h1 className="text-2xl font-medium tracking-tight">
              First — which language is this CV for?
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Each language uses its own profile database. You can maintain an
              English and a French CV side by side.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLang(l.value)}
                  className="rounded-xl border border-border p-6 text-left transition-colors hover:border-foreground/25 hover:bg-muted/30"
                >
                  <p className="text-base font-medium">{l.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{l.hint}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-medium tracking-tight">
                Job description
              </h1>
              <button
                onClick={() => setLang(null)}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground",
                )}
              >
                {lang === "fr" ? "Français" : "English"} · Change
              </button>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              One paste is enough — the title comes from the first line, and
              the CV is tailored from your{" "}
              {lang === "fr" ? "French" : "English"} profile.
            </p>

        <div className="mt-8 space-y-5 rounded-xl border border-border p-6">
          <Textarea
            rows={16}
            value={description}
            placeholder={`Paste the full job posting here — title, company, responsibilities, requirements, tech stack.\n\nExample:\nFrontend Developer (React / Next.js) — Remote\n\nAt Northbound Labs we build analytics tools for logistics teams. You'll own major product surfaces in React and TypeScript, style with Tailwind CSS, integrate REST/GraphQL APIs, and ship continuously through CI/CD on AWS.`}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">
              Saved to this browser — the backend comes later.
            </p>
            <Button onClick={analyze} disabled={!canAnalyze || busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 text-blue-600" />
              )}
              {busy ? "Analyzing…" : "Analyze match"}
            </Button>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
