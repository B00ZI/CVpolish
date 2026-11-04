"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Printer, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import type { GapAnalysis, Job, MasterProfile } from "@/lib/types";
import { getJob, upsertJob } from "@/lib/jobs-store";
import { loadProfile, saveProfile } from "@/lib/profile-store";
import { mockAnalyze, mockAutoFit, mockProfile, withDelay } from "@/mock";
import { CvPreview } from "./cv-preview";

/** All text that is actually rendered on the CV — the live scan runs on this. */
function cvText(p: MasterProfile): string {
  const parts = [p.contact.fullName, p.contact.targetTitle, p.summary];
  for (const e of p.experience)
    parts.push(e.jobTitle, e.company, e.location, e.bullets.join(" "));
  for (const prj of p.projects)
    parts.push(prj.name, prj.techStack.join(" "), prj.bullets.join(" "));
  for (const g of p.skillGroups) parts.push(g.skills.join(" "));
  parts.push(p.education.map((ed) => [ed.degree, ed.major, ed.university, ed.location].join(" ")).join(" "));
  for (const cert of p.certifications) parts.push(cert.name, cert.issuer);
  return parts.join(" ").toLowerCase();
}

interface AnalysisBlockProps {
  analysis: GapAnalysis;
  /** Required keywords present on the CV right now (live scan, 0 API). */
  matchedLive: string[];
  /** Required keywords absent from the CV. */
  missingLive: string[];
  /** Live match score (recomputed from the scan). */
  score: number;
  targets: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  onQuickAdd: (kw: string, categoryId: string) => void;
  onNavigate: (targetId: string) => void;
  onHighlight: (keyword: string) => void;
  autofitting: boolean;
  onAutoFit: (prompt: string) => void;
}

export function Workspace({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [profile, setProfile] = useState<MasterProfile>(mockProfile);
  const [analyzing, setAnalyzing] = useState(false);
  const [autofitting, setAutofitting] = useState(false);
  const hitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hitTimer.current) clearTimeout(hitTimer.current);
    };
  }, []);

  /** Remove active highlight classes from the CV. */
  function clearHits() {
    document
      .querySelectorAll(".kw-hit, .kw-hit-soft")
      .forEach((el) => el.classList.remove("kw-hit", "kw-hit-soft"));
    const H = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    if (H) H.delete("kw");
    if (hitTimer.current) clearTimeout(hitTimer.current);
    hitTimer.current = null;
  }

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

  /** Persist a profile edit (inline CV edits + quick add). */
  function updateProfile(fn: (p: MasterProfile) => MasterProfile) {
    if (!job) return;
    const next = fn(profile);
    setProfile(next);
    saveProfile(next, job.language);
  }

  // ===== Live scan: every keyword (matched + missing) re-checked against
  // the CV on each edit — both directions stay truthful. No "add anyway":
  // a keyword is missing until its text actually lives on the CV. =====
  const [matchedLive, missingLive, score] = useMemo<[string[], string[], number]>(() => {
    if (!job?.analysis) return [[], [], 0];
    const a = job.analysis;
    const text = cvText(profile);
    const onCv = (kw: string) => text.includes(kw.toLowerCase());
    const required = [...new Set([...a.matched, ...a.missing])];
    const inCv = required.filter(onCv);
    const gone = required.filter((kw) => !onCv(kw));
    const total = required.length || 1;
    return [inCv, gone, Math.round((inCv.length / total) * 100)];
  }, [profile, job]);

  // Navigation targets in the CV (edits where keywords can land manually)
  const targets = useMemo<{ id: string; label: string }[]>(() => {
    return [
      { id: "summary", label: "Summary" },
      ...profile.experience.map((e) => ({
        id: e.id,
        label: `${e.jobTitle || "Experience"}${e.company ? ` — ${e.company}` : ""}`,
      })),
      ...profile.projects.map((p) => ({
        id: p.id,
        label: `Project — ${p.name || "untitled"}`,
      })),
    ];
  }, [profile]);

  const categories = profile.skillGroups.map((g) => ({
    id: g.id,
    label: g.category,
  }));

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

  /** Navigation: amber-highlight a section in the CV and scroll to it.
   *  Does not open any editor — the user picks edit or add. */
  function navigate(targetId: string) {
    const el = document.querySelector<HTMLElement>(
      `[data-cv-target="${targetId}"]`,
    );
    if (!el) return;
    clearHits();
    el.classList.add("kw-hit-soft");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    hitTimer.current = window.setTimeout(clearHits, 3000);
  }

  /** Word-level keyword hit: only the exact word(s) turn emerald ~3s,
   *  via the CSS Custom Highlight API (no DOM mutation, React-safe).
   *  Old browsers fall back to whole-span block highlight. */
  function highlight(keyword: string) {
    const root = document.getElementById("cv-preview");
    if (!root) return;
    clearHits();

    const cssHighlights = (
      CSS as unknown as { highlights?: Map<string, unknown> }
    ).highlights;
    const RangeCtor = window.Range;
    const HighlightCtor = (
      window as unknown as { Highlight?: new (...r: Range[]) => unknown }
    ).Highlight;

    // Collect a Range per occurrence, walking all text nodes of the CV
    const ranges: Range[] = [];
    const kw = keyword.toLowerCase();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = (node as Text).data.toLowerCase();
      let from = 0;
      let idx = text.indexOf(kw, from);
      while (idx !== -1) {
        const r = new RangeCtor();
        r.setStart(node, idx);
        r.setEnd(node, idx + kw.length);
        ranges.push(r);
        from = idx + kw.length;
        idx = text.indexOf(kw, from);
      }
      node = walker.nextNode();
    }

    if (ranges.length === 0) {
      toast("Not on the CV (yet)", {
        description: `"${keyword}" appears nowhere in your CV text right now.`,
      });
      return;
    }

    const first = ranges[0].startContainer.parentElement ??
      (ranges[0].startContainer as Text).parentElement;
    first?.scrollIntoView({ behavior: "smooth", block: "center" });

    if (cssHighlights && HighlightCtor) {
      const hl = new HighlightCtor(...ranges);
      cssHighlights.set("kw", hl);
    } else {
      // Fallback: highlight the whole editable span (block level)
      for (const r of ranges) {
        const el = (r.startContainer as Text).parentElement;
        if (el && !el.classList.contains("kw-hit")) el.classList.add("kw-hit");
      }
    }
    hitTimer.current = window.setTimeout(clearHits, 3000);
  }

  /** Quick add: append a missing keyword to a skill category (0 tokens). */
  function quickAdd(kw: string, categoryId: string) {
    updateProfile((p) => ({
      ...p,
      skillGroups: p.skillGroups.map((g) =>
        g.id === categoryId && !g.skills.includes(kw)
          ? { ...g, skills: [...g.skills, kw] }
          : g,
      ),
    }));
  }

  /** Bulk AI fit: the user prompts how the missing keywords should be
   *  woven in; mock for POST /api/cv/integrate-missing (Gemini). */
  async function autoFit(prompt: string) {
    if (autofitting || missingLive.length === 0) return;
    setAutofitting(true);
    const kws = missingLive;
    await withDelay(null, 1800);
    void prompt; // real backend sends this as part of the request body
    updateProfile((p) => mockAutoFit(p, kws, job!.language));
    setAutofitting(false);
    toast("AI fit done", {
      description: `${kws.length} keyword${kws.length > 1 ? "s" : ""} woven into your bullets (mock POST /api/cv/integrate-missing).`,
    });
  }

  return (
    <div className="min-h-screen print:min-h-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden print:h-auto print:overflow-visible">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur print:hidden lg:shrink-0">
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

      {/* Single view: two independent panes on desktop — the left panel
          is fully pinned (it never moves, no matter how far you scroll) */}
      <main className="mx-auto max-w-[1500px] px-6 pb-24 pt-8 print:p-0 lg:flex lg:h-full lg:min-h-0 lg:pb-2 lg:pr-3 print:h-auto print:overflow-visible">
        <div className="grid gap-10 lg:h-full lg:w-full lg:grid-cols-[minmax(360px,440px)_1fr] lg:gap-16 print:block print:h-auto">
          {/* ===== Left: match & gaps (its own scroll) + pinned finish bar ===== */}
          <aside className="flex flex-col gap-6 print:hidden lg:h-full lg:pr-3">
            <div className="cv-scroll min-h-0 flex-1 space-y-8 overflow-y-auto pr-0">
              {job.analysis ? (
                <AnalysisBlock
                  analysis={job.analysis}
                  matchedLive={matchedLive}
                  missingLive={missingLive}
                  score={score}
                  targets={targets}
                  categories={categories}
                  onQuickAdd={quickAdd}
                  onNavigate={navigate}
                  onHighlight={highlight}
                  autofitting={autofitting}
                  onAutoFit={autoFit}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-12 text-center">
                  <h2 className="text-base font-medium">No analysis yet</h2>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
                    Compare this job description against your profile to see
                    the match score and missing keywords.
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
            </div>

            {/* Always-visible finish bar */}
            <div className="shrink-0 border-t border-border pt-4">
              <Button onClick={() => window.print()} className="w-full">
                <Printer className="h-4 w-4" />
                Print / Save as PDF
              </Button>
              <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                Click any line to edit it. Hover a section to reveal{" "}
                <span className="font-medium text-foreground">+ add</span> a
                bullet — or flash a section from a missing keyword, then use
                its add option. When you&apos;re happy, print above.
              </p>
            </div>
          </aside>

          {/* ===== Right: the live CV — scrolls independently; padding keeps
              the sheet from ending at the pane's bottom edge ===== */}
          <div className="cv-scroll min-w-0 pb-24 lg:pr-4 print:h-auto print:overflow-visible print:pb-0 lg:h-full lg:overflow-y-auto">
            <CvPreview profile={profile} job={job} onEditProfile={updateProfile} />
          </div>
        </div>
      </main>
    </div>
  );
}

// ===== Score + keyword chips with the 3 actions =====

function AnalysisBlock({
  analysis,
  matchedLive,
  missingLive,
  score,
  targets,
  categories,
  onQuickAdd,
  onNavigate,
  onHighlight,
  autofitting,
  onAutoFit,
}: AnalysisBlockProps) {
  const [askAi, setAskAi] = useState(false);
  const [prompt, setPrompt] = useState("");

  // Collapse the prompt form once nothing is missing anymore
  useEffect(() => {
    if (missingLive.length === 0) {
      setAskAi(false);
      setPrompt("");
    }
  }, [missingLive.length]);

  return (
    <>
      {/* Score — updates live as keywords land in the CV */}
      <div className="flex items-center gap-6 rounded-xl border border-border p-6">
        <div className="text-center">
          <p className="text-4xl font-medium tabular-nums tracking-tight">
            {score}%
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">match</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {matchedLive.length} covered · {missingLive.length} missing
            keywords
          </p>
        </div>
      </div>

      {/* Matched */}
      <section>
        <h2 className="text-base font-medium">You already have</h2>
        {matchedLive.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">
            None of your keywords appear in this description — paste the full
            requirements section?
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {matchedLive.map((kw) => (
              <MatchedChip key={kw} keyword={kw} onHighlight={onHighlight} />
            ))}
          </div>
        )}
      </section>

      {/* Missing */}
      <section>
        <h2 className="text-base font-medium">Missing from your data</h2>
        {missingLive.length === 0 ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            You cover every keyword this job lists.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Type it in the CV and it turns green on its own — or use one of
              the actions below.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingLive.map((kw) => (
                <MissingChip
                  key={kw}
                  keyword={kw}
                  targets={targets}
                  categories={categories}
                  onQuickAdd={(catId) => onQuickAdd(kw, catId)}
                  onNavigate={(targetId) => onNavigate(targetId)}
                />
              ))}
            </div>

            {/* Ask AI — user-written prompt, one mocked call for all keywords */}
            <div className="mt-5 rounded-xl border border-dashed border-border p-3">
              {!askAi ? (
                <button
                  type="button"
                  onClick={() => setAskAi(true)}
                  className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  Ask AI to fit {missingLive.length} keyword
                  {missingLive.length > 1 ? "s" : ""} in
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <p className="text-sm font-medium">Your prompt</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Tell the AI how to weave {missingLive.join(", ")} into
                      your CV.
                    </p>
                  </div>
                  <Textarea
                    autoFocus
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Example: mention Kubernetes in the context of my platform role — keep each bullet to one sentence and stay factual."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={autofitting}
                      onClick={() => {
                        setAskAi(false);
                        setPrompt("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={autofitting || prompt.trim().length === 0}
                      onClick={() => onAutoFit(prompt.trim())}
                    >
                      {autofitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-blue-600" />
                      )}
                      {autofitting ? "Fitting…" : "Generate"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}

/** Green chip — click flashes every CV spot where the keyword appears. */
function MatchedChip({
  keyword,
  onHighlight,
}: {
  keyword: string;
  onHighlight: (kw: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onHighlight(keyword)}
      title="Show on the CV"
      className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2.5 pr-3 text-sm text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
    >
      <Check className="h-3 w-3" />
      {keyword}
    </button>
  );
}

// ===== Missing keyword chip: quick add to skills / navigate to edit =====

function MissingChip({
  keyword,
  targets,
  categories,
  onQuickAdd,
  onNavigate,
}: {
  keyword: string;
  targets: { id: string; label: string }[];
  categories: { id: string; label: string }[];
  onQuickAdd: (categoryId: string) => void;
  onNavigate: (targetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 py-1 pl-2.5 pr-3 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          {keyword}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-4">
        <p className="text-sm font-medium">{keyword}</p>

        {/* 1 — Quick add to skills (client-side, 0 tokens) */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Quick add to skills
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onQuickAdd(c.id);
                  toast("Added to skills", {
                    description: `${keyword} → ${c.label}. It turns green in the CV instantly.`,
                  });
                  close();
                }}
                className="rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2 — Manual target navigation (client-side, 0 tokens) */}
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Or edit a specific section manually
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onNavigate(t.id);
                  close();
                }}
                className="max-w-full truncate rounded-md border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
