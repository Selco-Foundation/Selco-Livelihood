import type { RejectionReasonOption } from "../types/facility-review";

// MDMS `Installation.RejectionReasons` — matches qc's own module/master
// exactly (Digit.Hooks.useCustomMDMS(tenantId, "Installation",
// [{name: "RejectionReasons"}])). Verified against the real master: raw
// entries are exactly `{ code, name }`, one of them `{ code: "OTHER",
// name: "Other" }` — no `active` flag, no asset-type/section association,
// no i18n key; qc uses `name` as the plain display label (not translated)
// and always sorts the "Other" entry last.
export interface RawRejectionReasonOption {
  code?: string;
  name?: string;
}

/** Mirrors qc's `isOtherReason` — an "Other"/"Others" reason requires a
 * comment before it can be saved (see RejectionReasonDialog.tsx). */
export function isOtherReason(option: RejectionReasonOption): boolean {
  const normalize = (value: string) => value.trim().toLowerCase();
  return ["other", "others"].includes(normalize(option.code)) || ["other", "others"].includes(normalize(option.name));
}

/** Mirrors qc's `sortReasonsWithOtherLast` — alphabetical by name, with the
 * "Other"/"Others" entry always pushed to the end. */
function sortReasonsWithOtherLast(a: RejectionReasonOption, b: RejectionReasonOption): number {
  const aOther = isOtherReason(a);
  const bOther = isOtherReason(b);
  if (aOther && !bOther) {
    return 1;
  }
  if (!aOther && bOther) {
    return -1;
  }
  return a.name.localeCompare(b.name);
}

/** Pure — extracts and shapes the options list from the MDMS master's raw
 * response. The caller (a hook) does the actual `fetchMdmsMasters` call. */
export function mapRejectionReasonOptions(masters: Record<string, unknown[]>): RejectionReasonOption[] {
  const raw = (masters.RejectionReasons as RawRejectionReasonOption[] | undefined) ?? [];

  return raw
    .filter((option): option is RawRejectionReasonOption & { code: string; name: string } =>
      Boolean(option.code && option.name),
    )
    .map((option) => ({ code: option.code, name: option.name }))
    .sort(sortReasonsWithOtherLast);
}
