// MDMS `HCM-PROJECT-TYPES.JustificationCodePrefix` — a single-row master
// holding the fixed, non-editable prefix shown before the Justification Code
// field (e.g. "JUS", shown as "JUS-"). Kept out of this repo's own code per the ticket's
// requirement that the prefix never be hardcoded.
export interface RawJustificationCodePrefixOption {
  code?: string;
  prefix?: string;
  active?: boolean;
}

/** Used only while the MDMS master is loading or unreachable — a display-only
 * safety net so the field stays usable, never a source of truth for
 * validation (the backend/stored value never includes any prefix). */
export const FALLBACK_JUSTIFICATION_CODE_PREFIX = "JUS";

/** Pure — extracts the active prefix string from the MDMS master's raw
 * response. The caller (a hook) does the actual `fetchMdmsMasters` call. */
export function mapJustificationCodePrefix(masters: Record<string, unknown[]>): string {
  const raw: unknown[] = Array.isArray(masters.JustificationCodePrefix) ? masters.JustificationCodePrefix : [];

  // The master's rows arrive untyped, so check each one: only a non-empty string prefix on an
  // active row can be rendered before the code field.
  const active = raw.find((option): option is RawJustificationCodePrefixOption => {
    if (!option || typeof option !== "object") return false;
    const candidate = option as RawJustificationCodePrefixOption;
    return candidate.active !== false && typeof candidate.prefix === "string" && Boolean(candidate.prefix);
  });

  return active?.prefix ?? FALLBACK_JUSTIFICATION_CODE_PREFIX;
}
