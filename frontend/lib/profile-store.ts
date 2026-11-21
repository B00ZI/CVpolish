// Profile = the real backend now: GET/PUT/DELETE /api/profile.
// ONE profile only. Load returns the server's document (or the empty
// structure it creates on first GET).

import { api } from "./api";
import type { ExtractResponse, MasterProfile } from "./types";

/** Valid empty profile — matches the backend's empty-structure response.
 *  updatedAt is a fixed placeholder (never read; keeps prerender pure). */
export function emptyProfile(): MasterProfile {
  return {
    contact: { fullName: "", targetTitle: "", phone: "", email: "", city: "" },
    summary: "",
    skillGroups: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    aiIntelligence: { masterKeywords: [], baselineSummary: "", lastExtractedAt: null },
    updatedAt: "1970-01-01T00:00:00.000Z",
  };
}

export function loadProfile(): Promise<MasterProfile> {
  return api<MasterProfile>("/api/profile");
}

/** Full replace (autosave). Server drops `updatedAt`, stamps its own. */
export function saveProfile(profile: MasterProfile): Promise<MasterProfile> {
  return api<MasterProfile>("/api/profile", { method: "PUT", json: profile });
}

/** Reset → server returns the fresh empty structure. */
export function clearProfile(): Promise<MasterProfile> {
  return api<MasterProfile>("/api/profile", { method: "DELETE" });
}

/** AI keyword extraction — saves the result server-side, returns it. */
export function extractIntelligence(): Promise<ExtractResponse> {
  return api<ExtractResponse>("/api/profile/extract-intelligence", {
    method: "POST",
    json: {},
  });
}
