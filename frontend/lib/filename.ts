// Shared CV-file naming: Name - Position - LANG.pdf, derived from the
// job's frozen CV. The user can always override it per job.
import type { Language, MasterProfile } from "./types";

export function defaultCvFileName(
  cv: MasterProfile,
  lang: Language,
): string {
  const name = cv.contact.fullName.trim() || "Untitled";
  const position = cv.contact.targetTitle.trim() || lang.toUpperCase();
  return `${name} - ${position} - ${lang.toUpperCase()}.pdf`;
}
