import { translateOr } from "@/shared";
import type { GeographyDetails, GeographyState } from "../types/project";

/** Normalizes a project's stored states to a list — real records use either the current `states[]`
 *  array or a legacy singular `state` object (both coexist depending on when the project was
 *  created); this is the one place that reconciles them. */
export function resolveStates(geography: GeographyDetails | undefined): GeographyState[] {
  if (geography?.states?.length) return geography.states;
  // NOSONAR: this is the one sanctioned reader of the deprecated field (see its own doc comment
  // on GeographyDetails.state) -- it exists specifically to bridge older records that still carry
  // the legacy single-state shape, so the reference cannot simply be removed.
  if (geography?.state) return [geography.state]; // NOSONAR
  return [];
}

/** Resolves a project's stored states to display names, one per state — same `BOUNDARY_<code>`
 *  localization convention used by `im`/`ir` (`InboxFilter`, `boundaryDisplayName`), falling back
 *  to the state's own `name` (often absent in real responses) or the raw code. */
export function resolveStateNames(geography: GeographyDetails | undefined, t: (key: string) => string): string[] {
  return resolveStates(geography).map((state) => translateOr(t, `BOUNDARY_${state.code}`, state.name ?? state.code));
}

/** Order-independent identity of every code in a geography, for "has it changed?" checks. Codes
 *  only: a plan read back from field-planner carries no names or parent codes, so comparing whole
 *  objects would call an untouched plan changed. */
export function geographyCodesKey(geography: GeographyDetails | undefined): string {
  return [
    ...resolveStates(geography).map((state) => state.code),
    ...(geography?.districts ?? []).map((district) => district.code),
    ...(geography?.blocks ?? []).map((block) => block.code),
  ]
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}
