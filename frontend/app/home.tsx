"use client";

// Home screen: saved CVs + profile nudge + new-CV CTA.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Job, MasterProfile } from "@/lib/types";
import { profileCompleteness } from "@/lib/completeness";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopBar } from "@/components/top-bar";
import { loadProfile } from "@/lib/profile-store";
import { deleteJob, loadJobs } from "@/lib/jobs-store";
import { mockJobs, mockProfile } from "@/mock";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Home() {
  const [profile, setProfile] = useState<MasterProfile>(mockProfile);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  // Load saved profile + jobs after mount (avoids hydration mismatch).
  useEffect(() => {
    setProfile(loadProfile());
    setJobs(loadJobs());
  }, []);

  const completeness = profileCompleteness(profile);

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteJob(deleteTarget.id);
    setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id));
    toast("CV deleted", {
      description: `"${deleteTarget.title}" was removed.`,
    });
    setDeleteTarget(null);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <TopBar
        left={
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            CVPolish
          </Link>
        }
        right={
          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Your CVs
            </Link>
            <Link
              href="/profile"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Profile
            </Link>
            <ThemeToggle />
          </nav>
        }
      />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight">Your CVs</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tailored CVs you&apos;ve built. Reopen one to edit or print it
              again.
            </p>
          </div>
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              New CV for a job
            </Link>
          </Button>
        </div>

        {/* Profile nudge */}
        {completeness < 100 ? (
          <Link
            href="/profile"
            className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900"
          >
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-900 dark:text-amber-100">
              Profile is {completeness}% complete — finish it so every new CV
              starts fuller.
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          </Link>
        ) : (
          <Link
            href="/profile"
            className="mt-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Check className="h-4 w-4 text-emerald-600" />
            Profile complete — review your CV database
          </Link>
        )}

        {/* CV cards */}
        {jobs.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border p-12 text-center">
            <h2 className="text-base font-medium">No CVs yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Paste a job description and CVPolish builds a tailored CV from
              your profile.
            </p>
            <Button asChild className="mt-5">
              <Link href="/jobs/new">
                <Plus className="h-4 w-4" />
                Create your first CV
              </Link>
            </Button>
          </div>
        ) : (
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="group relative rounded-xl border border-border p-5 transition-colors hover:border-foreground/25 hover:bg-muted/30"
              >
                {/* Transparent overlay link: the WHOLE card opens the CV,
                    while the delete button stays a real, separate button. */}
                <Link
                  href={`/jobs/${job.id}`}
                  className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label={`Open "${job.title}"`}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 pr-6">
                    <p className="truncate text-[15px] font-medium">
                      {job.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-medium tabular-nums tracking-tight">
                      {job.analysis ? `${job.analysis.score}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">match</p>
                  </div>
                </div>

                {job.analysis ? (
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {job.analysis.matched.length} matched
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {job.analysis.missing.length} missing
                    </span>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </span>
                  <div className="relative flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="px-1.5 text-[11px] text-muted-foreground"
                    >
                      {job.language === "fr" ? "FR" : "EN"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative z-20 h-7 w-7 text-muted-foreground/60 transition-colors hover:text-destructive"
                      onClick={() => setDeleteTarget(job)}
                      aria-label={`Delete "${job.title}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this CV?</DialogTitle>
            <DialogDescription>
              &quot;{deleteTarget?.title}&quot; and its saved tailoring (score,
              CV edits, filename) will be removed for good.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete CV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
