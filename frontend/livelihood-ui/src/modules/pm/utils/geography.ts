import { MOCK_BOUNDARY_HIERARCHY } from "../constants/boundary-data";
import type { GeographyDetails } from "../types/project";

/** Resolves a project's stored state codes to display names via the (mock)
 *  boundary hierarchy — returns "" when there's nothing to resolve so callers
 *  can fall back to another source (e.g. `project.address.boundary`). */
export function resolveStateNames(geography?: GeographyDetails): string {
  if (!geography?.states?.length) return "";
  return geography.states
    .map((state) => MOCK_BOUNDARY_HIERARCHY.states.find((s) => s.code === state.code)?.name ?? state.code)
    .join(", ");
}
