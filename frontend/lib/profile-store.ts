// LocalStorage = the fake backend during the mock phase.
// Same shape the real API will use, so the swap later is trivial.

import type { Language, MasterProfile } from "./types";
import { mockProfile, mockProfileFr } from "@/mock";

export const PROFILE_KEY = "cvpolish.profile.v1"; // English db
export const PROFILE_KEY_FR = "cvpolish.profile.fr.v1"; // French db

function keyFor(lang: Language): string {
  return lang === "fr" ? PROFILE_KEY_FR : PROFILE_KEY;
}

function mockFor(lang: Language): MasterProfile {
  return lang === "fr" ? mockProfileFr : mockProfile;
}

export function loadProfile(lang: Language = "en"): MasterProfile {
  if (typeof window === "undefined") return mockFor(lang);
  try {
    const raw = localStorage.getItem(keyFor(lang));
    if (raw) {
      // Merge over mock so new fields added later still get defaults.
      return { ...mockFor(lang), ...(JSON.parse(raw) as MasterProfile) };
    }
  } catch {
    // corrupted storage -> fall through to mock
  }
  return mockFor(lang);
}

export function saveProfile(profile: MasterProfile, lang: Language = "en"): void {
  try {
    localStorage.setItem(keyFor(lang), JSON.stringify(profile));
  } catch {
    // storage blocked/full -> ignore, app still works in-session
  }
}

export function clearProfile(lang: Language = "en"): void {
  try {
    localStorage.removeItem(keyFor(lang));
  } catch {
    // ignore
  }
}
