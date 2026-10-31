// Barrel for all mock data. Import from here:
//   import { mockProfile, mockJobs } from "@/mock";
// Simulated latency helper for fake "AI" calls during the mock phase.

export { mockProfile } from "./profile";
export { mockJobs } from "./jobs";
export { mockAnalyze, mockRewrites } from "./generate";

import type { Job } from "@/lib/types";
import { mockJobs } from "./jobs";

export function getMockJob(id: string): Job | undefined {
  return mockJobs.find((j) => j.id === id);
}

/** Fake network delay so loading states look real. */
export function withDelay<T>(value: T, ms = 1200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
