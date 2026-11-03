// LocalStorage = the fake backend during the mock phase.
// Same shape the real API will use, so the swap later is trivial.

import type { AiIntelligence, Language, MasterProfile } from "./types";
import { mockProfile, mockProfileFr } from "@/mock";

export const PROFILE_KEY = "cvpolish.profile.v1"; // English db
export const PROFILE_KEY_FR = "cvpolish.profile.fr.v1"; // French db

function keyFor(lang: Language): string {
  return lang === "fr" ? PROFILE_KEY_FR : PROFILE_KEY;
}

function mockFor(lang: Language): MasterProfile {
  return lang === "fr" ? mockProfileFr : mockProfile;
}

/** Old saves had flat `keywords`; fold them into aiIntelligence. */
function migrateAi(p: Partial<MasterProfile>, mock: MasterProfile): AiIntelligence {
  if (p.aiIntelligence) return p.aiIntelligence;
  // `keywords` no longer exists on the type but may exist in old saved data.
  const legacy = (p as Record<string, unknown>)["keywords"] as string[] | undefined;
  return {
    masterKeywords: Array.isArray(legacy) ? legacy : mock.aiIntelligence.masterKeywords,
    baselineSummary: mock.aiIntelligence.baselineSummary,
    lastExtractedAt: mock.aiIntelligence.lastExtractedAt,
  };
}

export function loadProfile(lang: Language = "en"): MasterProfile {
  if (typeof window === "undefined") return mockFor(lang);
  const mock = mockFor(lang);
  try {
    const raw = localStorage.getItem(keyFor(lang));
    if (raw) {
      const saved = JSON.parse(raw) as Partial<MasterProfile>;
      // Merge over mock so new fields added later still get defaults.
      return {
        ...mock,
        ...saved,
        aiIntelligence: migrateAi(saved, mock),
      } as MasterProfile;
    }
  } catch {
    // corrupted storage -> fall through to mock
  }
  return mock;
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
