"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, FileText, Loader2, Printer, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackLink, TopBar } from "@/components/top-bar";
import type { GapAnalysis, Job, Language, MasterProfile } from "@/lib/types";
import {
  getJob,
  integrateJob,
  patchJob,
  putCv,
  translateJob,
} from "@/lib/jobs-store";
import { errMsg } from "@/lib/api";
import { defaultCvFileName } from "@/lib/filename";
import { cvText } from "@/lib/cv-text";
import { CvPreview } from "./cv-preview";

interface AnalysisBlockProps {
  analysis: GapAnalysis;
  /** Did the AI actually generate this CV (true) or did the fallback
   *  freeze the profile as-is (false)? Drives the green/red status pill. */
  aiUsed: boolean;
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
  // profile = the DISPLAYED CV document: job.cv (en) or job.cvFr (fr),
  // whichever job.language says is active. Edits write back to that one.
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [autofitting, setAutofitting] = useState(false);
  const [translating, setTranslating] = useState(false);
  // Brief emerald ring around the sheet after an AI action — shows WHERE
  // the content changed.
  const [cvFlash, setCvFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);
  const hitTimer = useRef<number | null>(null);
  // Debounced PUT of the edited CV document (inline edits + quick add).
  const saveTimer = useRef<number | null>(null);
  const pendingSave = useRef<{ doc: MasterProfile; lang: Language } | null>(null);

  function flashCv() {
    setCvFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setCvFlash(false), 2200);
  }

  /** Push the latest pending edit to the server (if any). AI actions await
   *  this first so they never read a stale document. */
  function flushSave(): Promise<void> {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingSave.current;
    if (!pending) return Promise.resolve();
    pendingSave.current = null;
    return putCv(jobId, pending.doc, pending.lang)
      .then(() => undefined)
      .catch((e) => {
        toast.error("Couldn't save the CV", { description: errMsg(e) });
      });
  }

  function scheduleSave(doc: MasterProfile, lang: Language) {
    pendingSave.current = { doc, lang };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flushSave(), 700);
  }

  useEffect(() => {
    return () => {
      if (hitTimer.current) clearTimeout(hitTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      void flushSave(); // don't lose the last edit on navigate-away
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Load the job from the backend (404/network error → not-found screen).
  useEffect(() => {
    let alive = true;
    getJob(jobId)
      .then((j) => {
        if (!alive) return;
        setJob(j);
        setProfile(j.language === "fr" && j.cvFr ? j.cvFr : j.cv);
      })
      .catch(() => {
        if (!alive) return;
        setJob(null);
        setProfile(null);
      });
    return () => {
      alive = false;
    };
  }, [jobId]);

  /** Optimistic small field change (title / fileName / language) + PATCH. */
  function patch(fields: {
    title?: string;
    fileName?: string;
    language?: Language;
  }) {
    setJob((prev) => (prev ? { ...prev, ...fields } : prev));
    patchJob(jobId, fields).catch((e) =>
      toast.error("Couldn't save", { description: errMsg(e) }),
    );
  }

  /** Persist a CV edit (inline edits + quick add) into the DISPLAYED
   *  document — job.cv when English is active, job.cvFr when French is.
   *  The other version and the master profile stay untouched.
   *  Debounced PUT; the server recomputes the analysis on write. */
  function updateProfile(fn: (p: MasterProfile) => MasterProfile) {
    if (!profile || !job) return;
    const doc = fn(profile);
    const lang = job.language;
    setProfile(doc);
    setJob((prev) => {
      if (!prev) return prev;
      return lang === "fr" && prev.cvFr
        ? { ...prev, cvFr: doc }
        : { ...prev, cv: doc };
    });
    scheduleSave(doc, lang);
  }

  /** EN/FR toggle: switch which saved version is shown (PATCH language).
   *  FR only when a translation exists — otherwise the button translates. */
  function switchLang(lang: Language) {
    if (!job || job.language === lang) return;
    if (lang === "fr" && !job.cvFr) return;
    const shown = lang === "fr" ? job.cvFr : job.cv;
    if (!shown) return;
    patch({ language: lang });
    setProfile(shown);
    clearHits();
  }

  /** Translate button (explicit, never automatic) → POST translate.
   *  Cached server-side: an existing French copy comes back for free. */
  async function translate() {
    if (translating || !job) return;
    setTranslating(true);
    try {
      await flushSave(); // AI must read the latest edits
      const r = await translateJob(job.id);
      setJob((prev) =>
        prev ? { ...prev, cvFr: r.cvFr, language: r.language } : prev,
      );
      if (r.language === "fr" && r.cvFr) setProfile(r.cvFr);
      if (r.aiUsed) {
        flashCv();
        toast.success("French version ready", {
          description:
            "AI translated it once and saved it — free to view from now on.",
        });
      } else {
        toast.error("No AI — French version not created", {
          description: r.cvFr
            ? "Kept your existing French copy. Nothing changed."
            : "Nothing was changed. Try again in a moment.",
        });
      }
    } catch (e) {
      toast.error("Translate failed", { description: errMsg(e) });
    } finally {
      setTranslating(false);
    }
  }

  // ===== Live scan: every keyword (matched + missing) re-checked against
  // the CV on each edit — both directions stay truthful. No "add anyway":
  // a keyword is missing until its text actually lives on the CV. =====
  const [matchedLive, missingLive, score] = useMemo<[string[], string[], number]>(() => {
    if (!job || !profile) return [[], [], 0];
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
    if (!profile) return [];
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

  const categories = (profile?.skillGroups ?? []).map((g) => ({
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
          This CV isn&apos;t on the server (or the backend is down). Start a
          new one from a job description.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to your CVs</Link>
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
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

  /** "Ask AI": one free-text prompt → POST integrate-missing against the
   *  ACTIVE document. Fallback leaves the CV untouched (aiUsed: false). */
  async function autoFit(prompt: string) {
    if (autofitting || missingLive.length === 0 || !job) return;
    setAutofitting(true);
    try {
      await flushSave(); // AI must read the latest edits
      const r = await integrateJob(job.id, prompt, job.language);
      setJob((prev) =>
        prev ? { ...prev, cv: r.cv, cvFr: r.cvFr } : prev,
      );
      const doc = job.language === "fr" ? r.cvFr : r.cv;
      if (doc) setProfile(doc);
      if (r.aiUsed) {
        flashCv();
        toast.success("AI applied your edit", {
          description: "Check the CV — your prompt was woven in.",
        });
      } else {
        toast.error("No AI — CV unchanged", {
          description: "Edit it manually or try again in a moment.",
        });
      }
    } catch (e) {
      toast.error("AI edit failed", { description: errMsg(e) });
    } finally {
      setAutofitting(false);
    }
  }

  /** Print with the CV's filename pre-set — Chrome's "Save as PDF" uses the
   *  page title as the default save name; we restore it right after. */
  function printCv() {
    if (!job || !profile) return;
    const prev = document.title;
    document.title = job.fileName ?? defaultCvFileName(profile, job.language);
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.title = prev;
      },
      { once: true },
    );
  }

  return (
    <div className="min-h-screen print:min-h-0 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden print:h-auto print:overflow-visible">
      {/* Top bar: back link · job title (opens details) · PDF file chip */}
      <TopBar
        left={
          <>
            <BackLink href="/">Your CVs</BackLink>
            <span aria-hidden className="block h-4 w-px bg-border" />
            <JobTitlePopover
              job={job}
              onSave={(title) => patch({ title })}
            />
            <FileChip
              job={job}
              onSave={(name) => patch({ fileName: name })}
            />
          </>
        }
        right={
          <>
            <LangToggle
              job={job}
              translating={translating}
              onSwitch={switchLang}
              onTranslate={translate}
            />
            <ThemeToggle />
          </>
        }
      />

      {/* Single view: two independent panes on desktop — the left panel
          is fully pinned (it never moves, no matter how far you scroll) */}
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-8 print:p-0 lg:flex lg:h-full lg:min-h-0 lg:pb-2 lg:pr-3 print:h-auto print:overflow-visible">
        <div className="grid gap-10 lg:h-full lg:w-full lg:grid-cols-[minmax(380px,480px)_1fr] lg:gap-24 print:block print:h-auto">
          {/* ===== Left: match & gaps (its own scroll) + pinned finish bar ===== */}
          <aside className="flex flex-col gap-6 print:hidden lg:h-full lg:pr-3">
            <div className="cv-scroll min-h-0 flex-1 space-y-8 overflow-y-auto pr-0">
              {job.analysis ? (
                <AnalysisBlock
                  analysis={job.analysis}
                  aiUsed={job.aiUsed ?? false}
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
              ) : null}
            </div>

            {/* Always-visible finish bar */}
            <div className="shrink-0 border-t border-border pt-4">
              <Button onClick={printCv} className="w-full">
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
          <div className="min-w-0 pb-24 pr-6 print:h-auto print:overflow-visible print:pb-0 lg:h-full lg:overflow-y-auto">
            <div
              className={cn(
                "mx-auto w-fit rounded-lg transition-all duration-500",
                cvFlash && "ring-2 ring-emerald-500/70",
              )}
            >
              <CvPreview profile={profile} job={job} onEditProfile={updateProfile} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** EN/FR switch for the CV's two versions. EN = source (always there),
 *  FR = the translated copy (POST .../translate). Clicking FR with no copy
 *  yet runs the translate action instead of switching. */
function LangToggle({
  job,
  translating,
  onSwitch,
  onTranslate,
}: {
  job: Job;
  translating: boolean;
  onSwitch: (lang: Language) => void;
  onTranslate: () => void;
}) {
  const frReady = Boolean(job.cvFr);
  return (
    <div className="flex overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        title="Show English CV"
        onClick={() => onSwitch("en")}
        className={cn(
          "px-2.5 py-1 text-xs transition-colors",
          job.language === "en"
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
      <button
        type="button"
        title={frReady ? "Show French CV" : "Translate to French (AI)"}
        disabled={translating}
        onClick={() => (frReady ? onSwitch("fr") : onTranslate())}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 text-xs transition-colors",
          job.language === "fr"
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:text-foreground",
          translating && "opacity-70",
        )}
      >
        {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        FR
        {!frReady && !translating ? (
          <Sparkles className="h-3 w-3 text-blue-600" />
        ) : null}
      </button>
    </div>
  );
}

/** Small popover next to the job title (same feel as the missing-keyword
 *  popover): rename the job — it's the navigation name on home cards — and
 *  re-read the original pasted posting. */
function JobTitlePopover({
  job,
  onSave,
}: {
  job: Job;
  onSave: (title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(job.title);

  // Re-sync the draft whenever the popover opens
  useEffect(() => {
    if (open) setDraft(job.title);
  }, [open, job.title]);

  function commit() {
    const v = draft.trim();
    if (v && v !== job.title) onSave(v);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Job title and original posting"
          className="min-w-0 truncate text-sm font-medium text-foreground/90 underline-offset-4 hover:underline"
        >
          {job.title}
          {job.company ? ` @ ${job.company}` : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[420px] space-y-3">
        <div>
          <Label htmlFor="job-title-input">Job title</Label>
          <Input
            id="job-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            className="mt-1.5"
          />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Original job description
          </p>
          <div className="cv-scroll mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2.5 text-xs leading-relaxed">
            {job.description}
          </div>
        </div>
        <Button size="sm" className="w-full" disabled={!draft.trim()} onClick={commit}>
          Save title
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** Editable PDF filename chip in the top bar. Empty/blank name falls back
 *  to the default "Name - Position - LANG.pdf" derived from the frozen CV. */
function FileChip({
  job,
  onSave,
}: {
  job: Job;
  onSave: (name: string) => void;
}) {
  const fallback = defaultCvFileName(job.cv, job.language);
  const fileName = job.fileName?.trim() ? job.fileName : fallback;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && v !== job.fileName) onSave(v);
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          else if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-7 w-56 text-xs"
      />
    );
  }

  return (
    <button
      type="button"
      title="PDF filename — click to rename"
      onClick={() => {
        setDraft(fileName);
        setEditing(true);
      }}
      className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:flex"
    >
      <FileText className="h-3 w-3 shrink-0" />
      {fileName}
    </button>
  );
}

// ===== Score + keyword chips with the 3 actions =====

function AnalysisBlock({
  analysis,
  aiUsed,
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
      {/* Score card — the AI status banner says plainly who wrote this CV */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div
          className={cn(
            "flex items-start gap-2.5 border-b px-5 py-3 text-sm",
            aiUsed
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
          )}
        >
          {aiUsed ? (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <div className="min-w-0">
            <p className="font-medium">
              {aiUsed ? "AI tailored this CV" : "No AI — profile copied as-is"}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {aiUsed
                ? "Summary and bullets were rewritten for this job description."
                : "The AI didn't run (no key, quota or error). This is your profile, unchanged."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-6">
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

            {/* Ask AI — user-written prompt, one call for all keywords */}
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
                  <Textarea
                    autoFocus
                    rows={3}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Say where each keyword is used and how — tied to your existing experience and projects. Example: Kubernetes fits my platform-engineer role, where I led the cluster migration and set up autoscaling."
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="flex-1"
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
                      className="flex-1"
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
