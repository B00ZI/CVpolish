"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { GapAnalysis, Job, MasterProfile } from "@/lib/types";
import { getJob, upsertJob } from "@/lib/jobs-store";
import { loadProfile, saveProfile } from "@/lib/profile-store";
import { mockAnalyze, mockProfile, withDelay } from "@/mock";
import { CvPreview } from "./cv-preview";

export function Workspace({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [profile, setProfile] = useState<MasterProfile>(mockProfile);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const j = getJob(jobId);
    setJob(j ?? null);
    // Load the profile db for this job's language (EN or FR).
    if (j) setProfile(loadProfile(j.language));
  }, [jobId]);

  function mutate(fn: (j: Job) => Job) {
    setJob((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      upsertJob(next);
      return next;
    });
  }

  if (job === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-medium">Job not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This CV lives in the browser it was created in. Start a new one from
          a job description.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to your CVs</Link>
        </Button>
      </div>
    );
  }

  async function analyzeNow() {
    if (analyzing) return;
    setAnalyzing(true);
    await withDelay(null, 1200);
    mutate((j) => ({ ...j, analysis: mockAnalyze(j, profile) }));
    setAnalyzing(false);
  }

  return (
    <div className="min-h-screen print:min-h-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Your CVs
            </Link>
            <span className="min-w-0 truncate text-sm font-medium">
              {job.title}
              {job.company ? ` @ ${job.company}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Badge variant="secondary">
              {job.status === "tailed" ? "Ready to print" : "In progress"}
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Single view: match & gaps on the left, live CV on the right */}
      <main className="mx-auto max-w-[1500px] px-6 pb-24 pt-8 print:p-0">
        <div className="grid gap-10 lg:grid-cols-[minmax(360px,440px)_1fr] print:block">
          {/* ===== Left: match & gaps ===== */}
          <aside className="space-y-8 self-start print:hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {job.analysis ? (
              <AnalysisBlock
                analysis={job.analysis}
                onSaveNote={(kw, note) =>
                  mutate((j) => ({
                    ...j,
                    analysis: j.analysis
                      ? {
                          ...j.analysis,
                          notes: { ...j.analysis.notes, [kw]: note },
                        }
                      : j.analysis,
                  }))
                }
                onAddAnyway={(kw) =>
                  mutate((j) => ({
                    ...j,
                    analysis: j.analysis
                      ? { ...j.analysis, added: [...j.analysis.added, kw] }
                      : j.analysis,
                  }))
                }
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center">
                <h2 className="text-base font-medium">No analysis yet</h2>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                  Compare this job description against your profile to see the
                  match score and missing keywords.
                </p>
                <Button
                  className="mt-5"
                  onClick={analyzeNow}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  )}
                  {analyzing ? "Analyzing…" : "Analyze match"}
                </Button>
              </div>
            )}

            {/* Notes for the AI */}
            {Object.entries(job.analysis?.notes ?? {}).length > 0 && (
              <section>
                <h2 className="text-base font-medium">Context for the AI</h2>
                <ul className="mt-3 space-y-1.5">
                  {Object.entries(job.analysis?.notes ?? {}).map(
                    ([kw, note]) => (
                      <li key={kw} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {kw}
                        </span>{" "}
                        — {note}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )}
          </aside>

          {/* ===== Right: the live CV — edit inline, watch the score, print ===== */}
          <div className="min-w-0">
            <CvPreview
              profile={profile}
              job={job}
              onPrint={() => window.print()}
              onEditProfile={(fn) => {
                const next = fn(profile);
                setProfile(next);
                saveProfile(next, job.language);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// ===== Score + keyword chips (empty states included) =====

function AnalysisBlock({
  analysis,
  onSaveNote,
  onAddAnyway,
}: {
  analysis: GapAnalysis;
  onSaveNote: (keyword: string, note: string) => void;
  onAddAnyway: (keyword: string) => void;
}) {
  return (
    <>
      {/* Score */}
      <div className="flex items-center gap-6 rounded-xl border border-border p-6">
        <div className="text-center">
          <p className="text-4xl font-medium tabular-nums tracking-tight">
            {analysis.score}%
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">match</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${analysis.score}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {analysis.matched.length} matched · {analysis.missing.length}{" "}
            missing keywords
          </p>
        </div>
      </div>

      {/* Matched */}
      <section>
        <h2 className="text-base font-medium">You already have</h2>
        {analysis.matched.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            None of your keywords appear in this description — paste the full
            requirements section?
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.matched.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2.5 pr-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              >
                <Check className="h-3 w-3" />
                {kw}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Missing */}
      <section>
        <h2 className="text-base font-medium">Missing from your data</h2>
        {analysis.missing.length === 0 ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            You cover every keyword this job lists.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Click a keyword: add context for the AI, or force it in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.missing.map((kw) => (
                <MissingChip
                  key={kw}
                  keyword={kw}
                  note={analysis.notes[kw]}
                  added={analysis.added.includes(kw)}
                  onSaveNote={(note) => onSaveNote(kw, note)}
                  onAddAnyway={() => onAddAnyway(kw)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

// ===== Missing keyword chip with note popover =====

function MissingChip({
  keyword,
  note,
  added,
  onSaveNote,
  onAddAnyway,
}: {
  keyword: string;
  note?: string;
  added: boolean;
  onSaveNote: (note: string) => void;
  onAddAnyway: () => void;
}) {
  const [draft, setDraft] = useState(note ?? "");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border py-1 pl-2.5 pr-3 text-sm transition-colors",
            added
              ? "border-border bg-muted/40 text-muted-foreground"
              : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          {added && <Check className="h-3 w-3" />}
          {keyword}
          {!added && note && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-sm font-medium">{keyword}</p>
        {added ? (
          <p className="text-xs text-muted-foreground">
            Added anyway — the AI will try to include it.
          </p>
        ) : (
          <>
            <Textarea
              rows={2}
              value={draft}
              placeholder="Context: where do you have this? (e.g. “used in my capstone”)"
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onAddAnyway();
                  setOpen(false);
                  toast("Added anyway", {
                    description: `${keyword} will be pushed into the rewrite.`,
                  });
                }}
              >
                Add anyway
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onSaveNote(draft.trim());
                  setOpen(false);
                  toast("Note saved", {
                    description: `The AI will use your context for ${keyword}.`,
                  });
                }}
              >
                Save note
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
