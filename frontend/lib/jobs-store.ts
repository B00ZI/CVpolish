// Jobs = localStorage fake backend during the mock phase.
// Saved jobs override mock jobs by id; new jobs append.

import type { Job } from "./types";
import { mockJobs } from "@/mock";

export const JOBS_KEY = "cvpolish.jobs.v1";
const DELETED_KEY = "cvpolish.jobs.deleted.v1";

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

/** Ids of mock jobs the user deleted — keeps deletions real across reloads
 *  during the mock phase (mocks can't be removed from the hardcoded array). */
function readTombstones(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function loadJobs(): Job[] {
  if (typeof window === "undefined") return mockJobs;
  const saved = readSaved();
  const savedIds = new Set(saved.map((j) => j.id));
  const deleted = new Set(readTombstones());
  const all = [...saved, ...mockJobs.filter((m) => !savedIds.has(m.id))];
  // Normalize old browser data: jobs saved before cvFr/aiUsed existed.
  return all
    .filter((j) => !deleted.has(j.id))
    .map((j) => ({
      ...j,
      language: j.language ?? "en",
      cvFr: j.cvFr ?? null,
      aiUsed: j.aiUsed ?? false,
    }));
}

export function getJob(id: string): Job | undefined {
  return loadJobs().find((j) => j.id === id);
}

/** Create or update one job (only that job gets persisted). */
export function upsertJob(job: Job): void {
  writeSaved([job, ...readSaved().filter((j) => j.id !== job.id)]);
}

/** Remove one job for good. Mock jobs get tombstoned so they stay gone. */
export function deleteJob(id: string): void {
  const deleted = readTombstones();
  if (!deleted.includes(id)) deleted.push(id);
  try {
    localStorage.setItem(DELETED_KEY, JSON.stringify(deleted));
  } catch {
    // storage blocked -> in-session list still drops it
  }
  writeSaved(readSaved().filter((j) => j.id !== id));
}
