import { translateOr } from "@/shared";
import type { GeographyDetails, GeographyState } from "../types/project";

/** Normalizes a project's stored states to a list — real records use either the current `states[]`
 *  array or a legacy singular `state` object (both coexist depending on when the project was
 *  created); this is the one place that reconciles them. */
export function resolveStates(geography: GeographyDetails | undefined): GeographyState[] {
  if (geography?.states?.length) return geography.states;
  if (geography?.state) return [geography.state];
  return [];
}

/** Resolves a project's stored states to display names, one per state — same `BOUNDARY_<code>`
 *  localization convention used by `im`/`ir` (`InboxFilter`, `boundaryDisplayName`), falling back
 *  to the state's own `name` (often absent in real responses) or the raw code. */
export function resolveStateNames(geography: GeographyDetails | undefined, t: (key: string) => string): string[] {
  return resolveStates(geography).map((state) => translateOr(t, `BOUNDARY_${state.code}`, state.name ?? state.code));
}
