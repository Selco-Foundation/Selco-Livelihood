import { translateOr } from "@/shared";

// Reuse ProjectFilter's own keys for the two codes it already maps, so the filter dropdown and
// the table badges never disagree on the same status's display text.
const STATUS_KEY_OVERRIDES: Record<string, string> = {
  SCHEDULED: "ES_PM_SCHEDULED",
  DRAFT: "ES_PM_DRAFT",
};

function humanize(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Resolves a project/installation-plan status code (e.g. `ASSIGNED_TO_FIELD_STAFF`) to display
 *  text, so tables never render a raw backend code. Codes are not a closed enum -- new workflow
 *  states can appear without a frontend release -- so any code not yet registered under
 *  `ES_PM_STATUS_<CODE>` still gets a readable Title Case fallback instead of raw SCREAMING_SNAKE. */
export function formatStatusLabel(t: (key: string) => string, code: string = "DRAFT"): string {
  const key = STATUS_KEY_OVERRIDES[code] ?? `ES_PM_STATUS_${code}`;
  return translateOr(t, key, humanize(code));
}
