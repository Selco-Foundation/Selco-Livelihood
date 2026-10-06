import { tenantId, translateOr, type BoundaryHierarchy, type BoundaryNode } from "@/shared";
import type { TFunction } from "i18next";
import type { JurisdictionBoundaryType, OrgJurisdiction } from "../types/organisation";

/** The boundary hierarchy users are assigned against — same as the rest of livelihood-ui. */
export const JURISDICTION_HIERARCHY = "SELCO";

/** One unsaved jurisdiction card: a cascading pick from Country down to Facility. */
export interface JurisdictionDraft {
  /** Local key for React lists only — never sent to the backend. */
  key: string;
  country: string;
  state: string;
  district: string;
  block: string;
  facility: string;
}

export const JURISDICTION_LEVELS = ["country", "state", "district", "block", "facility"] as const;
export type JurisdictionLevel = (typeof JURISDICTION_LEVELS)[number];

const LEVEL_TO_TYPE: Record<JurisdictionLevel, JurisdictionBoundaryType> = {
  country: "Country",
  state: "State",
  district: "District",
  block: "Block",
  facility: "Facility",
};

let draftSequence = 0;

export function emptyJurisdictionDraft(): JurisdictionDraft {
  draftSequence += 1;
  return { key: `draft-${draftSequence}`, country: "", state: "", district: "", block: "", facility: "" };
}

/** Nodes whose parent is the selected parent code; empty until a parent is chosen. */
export function childrenOf(nodes: BoundaryNode[] | undefined, parentCode: string): BoundaryNode[] {
  if (!parentCode) return [];
  return (nodes ?? []).filter((node) => node.parentCode === parentCode);
}

/** Countries aren't returned as their own list — they're the parents of the states. */
export function countriesOf(hierarchy: BoundaryHierarchy | undefined): BoundaryNode[] {
  const codes = [...new Set((hierarchy?.states ?? []).map((state) => state.parentCode).filter(Boolean))];
  return codes.map((code) => ({ code, parentCode: "" }));
}

/** Options for one level of a draft, given what's picked above it. */
export function optionsForLevel(
  level: JurisdictionLevel,
  draft: JurisdictionDraft,
  hierarchy: BoundaryHierarchy | undefined,
): BoundaryNode[] {
  switch (level) {
    case "country":
      return countriesOf(hierarchy);
    case "state":
      return childrenOf(hierarchy?.states, draft.country);
    case "district":
      return childrenOf(hierarchy?.districts, draft.state);
    case "block":
      return childrenOf(hierarchy?.blocks, draft.district);
    case "facility":
      return childrenOf(hierarchy?.facilities, draft.block);
  }
}

/** Changing a level clears everything below it. */
export function updateDraftLevel(draft: JurisdictionDraft, level: JurisdictionLevel, code: string): JurisdictionDraft {
  const next = { ...draft, [level]: code };
  const index = JURISDICTION_LEVELS.indexOf(level);
  for (const lower of JURISDICTION_LEVELS.slice(index + 1)) {
    next[lower] = "";
  }
  return next;
}

/** The deepest level picked in a draft — what gets saved — or null when nothing is picked. */
export function draftToJurisdiction(draft: JurisdictionDraft): OrgJurisdiction | null {
  for (const level of [...JURISDICTION_LEVELS].reverse()) {
    if (draft[level]) {
      return {
        hierarchy: JURISDICTION_HIERARCHY,
        boundary: draft[level],
        boundaryType: LEVEL_TO_TYPE[level],
        tenantId: tenantId(),
        isActive: true,
      };
    }
  }
  return null;
}

/** Display name for a boundary code — same `BOUNDARY_<code>` localization convention as eu/im/ir. */
export function boundaryDisplayName(code: string, t: TFunction): string {
  return translateOr(t, `BOUNDARY_${code}`, code);
}

export function boundaryTypeLabel(type: JurisdictionBoundaryType, t: TFunction): string {
  return translateOr(t, `CS_${type.toUpperCase()}`, type);
}
