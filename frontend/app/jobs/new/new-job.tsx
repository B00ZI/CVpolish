"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Job, Language } from "@/lib/types";
import { loadProfile } from "@/lib/profile-store";
import { upsertJob } from "@/lib/jobs-store";
import { mockAnalyze, withDelay } from "@/mock";
import { ThemeToggle } from "@/components/theme-toggle";
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
    const job: Job = {
      id: `job-${Date.now()}`,
      language: lang,
      title,
      company: "",
      description,
      createdAt: new Date().toISOString(),
      status: "analyzed",
      analysis: null,
      rewrites: [],
      tailored: null,
    };
    job.analysis = mockAnalyze(job, loadProfile(lang));
    await withDelay(null, 1400);
    upsertJob(job);
    router.push(`/jobs/${job.id}`);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Your CVs
          </Link>
          <ThemeToggle />
        </div>
      </header>

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
                New CV from a job
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
              {lang === "fr"
                ? "This CV is tailored from your French profile."
                : "This CV is tailored from your English profile."}
            </p>

        <div className="mt-8 space-y-5 rounded-xl border border-border p-6">
          <label className="block space-y-1.5">
            <span className="text-sm text-muted-foreground">
              Job description *
            </span>
            <Textarea
              rows={16}
              value={description}
              placeholder={`Paste the full job posting here — title, company, responsibilities, requirements, tech stack.\n\nExample:\nFrontend Developer (React / Next.js) — Remote\n\nAt Northbound Labs we build analytics tools for logistics teams. You'll own major product surfaces in React and TypeScript, style with Tailwind CSS, integrate REST/GraphQL APIs, and ship continuously through CI/CD on AWS.`}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Title and company are read from the first line — one paste is
            enough.
          </p>

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
