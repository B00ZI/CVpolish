// Jobs = localStorage fake backend during the mock phase.
// Saved jobs override mock jobs by id; new jobs append.

import type { Job } from "./types";
import { mockJobs } from "@/mock";

export const JOBS_KEY = "cvpolish.jobs.v1";

function readSaved(): Job[] {
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    return raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    return [];
  }
}

function writeSaved(jobs: Job[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // storage blocked/full -> app still works in-session
  }
}

export function loadJobs(): Job[] {
  if (typeof window === "undefined") return mockJobs;
  const saved = readSaved();
  const savedIds = new Set(saved.map((j) => j.id));
  const all = [...saved, ...mockJobs.filter((m) => !savedIds.has(m.id))];
  // Jobs saved before the language field existed default to English.
  return all.map((j) => ({ ...j, language: j.language ?? "en" }));
}

export function getJob(id: string): Job | undefined {
  return loadJobs().find((j) => j.id === id);
}

/** Create or update one job (only that job gets persisted). */
export function upsertJob(job: Job): void {
  writeSaved([job, ...readSaved().filter((j) => j.id !== job.id)]);
}
