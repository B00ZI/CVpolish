// LocalStorage = the fake backend during the mock phase.
// Same shape the real API will use (GET/PUT /api/profile), so the swap later
// is trivial. ONE profile only — the old FR profile key is orphaned by the
// single-profile redesign and is deliberately ignored.

import type { MasterProfile } from "./types";
import { mockProfile } from "@/mock";

export const PROFILE_KEY = "cvpolish.profile.v1";

export function loadProfile(): MasterProfile {
  if (typeof window === "undefined") return mockProfile;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<MasterProfile>;
      // Merge over mock so new fields added later still get defaults.
      return {
        ...mockProfile,
        ...saved,
        aiIntelligence: saved.aiIntelligence ?? mockProfile.aiIntelligence,
      } as MasterProfile;
    }
  } catch {
    // corrupted storage -> fall through to mock
  }
  return mockProfile;
}

export function saveProfile(profile: MasterProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // storage blocked/full -> ignore, app still works in-session
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}
