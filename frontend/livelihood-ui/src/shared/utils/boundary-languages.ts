import type { StateBoundaryLanguage, StateBoundaryLanguageEntry } from "../config/global-config";

export function dedupeLanguages(entries: StateBoundaryLanguageEntry[]): StateBoundaryLanguage[] {
  const seen = new Set<string>();
  const languages: StateBoundaryLanguage[] = [];

  for (const entry of entries) {
    for (const language of entry.languages) {
      if (seen.has(language.code)) continue;
      seen.add(language.code);
      languages.push(language);
    }
  }

  return languages;
}
