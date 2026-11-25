// Jobs = the real backend now. List is the light JobCard projection;
// full Job comes from create/get. Mutations are small request wrappers —
// callers own optimistic state updates and toasts.

import { api } from "./api";
import type {
  AiProgress,
  IntegrateResponse,
  Job,
  JobCard,
  Language,
  MasterProfile,
  TranslateResponse,
} from "./types";

export function aiRequestId(): string {
  return crypto.randomUUID();
}

export function getAiProgress(requestId: string): Promise<AiProgress> {
  return api<AiProgress>(`/api/jobs/ai-progress/${requestId}`);
}

export function loadJobs(): Promise<JobCard[]> {
  return api<JobCard[]>("/api/jobs");
}

/** 404 → throws ApiError; callers map failure to the "not found" screen. */
export function getJob(id: string): Promise<Job> {
  return api<Job>(`/api/jobs/${id}`);
}

/** Create + AI-tailor in one call (the product's core endpoint). */
export function createJob(description: string, requestId?: string): Promise<Job> {
  return api<Job>("/api/jobs", {
    method: "POST",
    json: { description },
    timeoutMs: 70_000,
    headers: requestId ? { "X-AI-Request-Id": requestId } : undefined,
  });
}

export function deleteJob(id: string): Promise<void> {
  return api<void>(`/api/jobs/${id}`, { method: "DELETE" });
}

/** Rename title / fileName / flip active language — send only what changed. */
export function patchJob(
  id: string,
  patch: { title?: string; fileName?: string; language?: Language },
): Promise<Job> {
  return api<Job>(`/api/jobs/${id}`, { method: "PATCH", json: patch });
}

/** Full replace of one document (en → cv, fr → cvFr). `language` omitted =
 *  the job's active version. Nothing to recompute server-side — the
 *  workspace's chips/score update live from the new text. */
export function putCv(
  id: string,
  cv: MasterProfile,
  language?: Language,
): Promise<MasterProfile> {
  return api<MasterProfile>(`/api/jobs/${id}/cv`, {
    method: "PUT",
    json: language ? { cv, language } : { cv },
  });
}

/** AI translate to French (cached server-side — repeat calls are free). */
export function translateJob(id: string, requestId?: string): Promise<TranslateResponse> {
  return api<TranslateResponse>(`/api/jobs/${id}/translate`, {
    method: "POST",
    json: { target: "fr" },
    timeoutMs: 70_000,
    headers: requestId ? { "X-AI-Request-Id": requestId } : undefined,
  });
}

/** "Ask AI" — one free-text prompt against the active document. */
export function integrateJob(
  id: string,
  prompt: string,
  language: Language,
  requestId?: string,
): Promise<IntegrateResponse> {
  return api<IntegrateResponse>(`/api/jobs/${id}/integrate-missing`, {
    method: "POST",
    json: { prompt, language },
    timeoutMs: 70_000,
    headers: requestId ? { "X-AI-Request-Id": requestId } : undefined,
  });
}
