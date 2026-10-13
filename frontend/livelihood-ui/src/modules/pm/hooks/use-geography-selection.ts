import { translateOr, useTranslate } from "@/shared";
import type { MultiSelectOption } from "@/ui";
import { useMemo } from "react";
import type { GeographyDetails } from "../types/project";
import { useBoundaryTree } from "./use-boundary-tree";

interface GeographySelectionOptions {
  value: GeographyDetails;
  onChange: (value: GeographyDetails) => void;
  /** Restricts what can be picked: a plan's options are its project's geography, and a published
   *  plan's are its own current geography (remove-only). Every boundary in the user's jurisdiction
   *  when absent. */
  allowed?: GeographyDetails;
  /** Codes that cannot be removed, mapped to why. Handlers keep them even if a caller drops them. */
  locked?: ReadonlyMap<string, string>;
  /** Called when a state/district deselection also drops some of its children. */
  onCascadeRemoval?: () => void;
}

interface GeographyLevel {
  options: MultiSelectOption[];
  selectedCodes: string[];
  selectedItems: MultiSelectOption[];
  onChange: (codes: string[]) => void;
}

function codesOf(entries: { code: string }[] | undefined): string[] {
  return entries?.map((entry) => entry.code) ?? [];
}

/**
 * The State → District → Block picker logic shared by the project's and the plan's geography
 * steps: option lists narrowed by the parent selection, and the cascade (dropping a state drops its
 * districts and blocks, dropping a district drops its blocks).
 *
 * Parent links come from the boundary tree, never from the stored value -- a plan read back from
 * field-planner carries bare codes with blank `stateCode`/`districtCode`, which would otherwise make
 * the first cascade drop every child.
 *
 * Locked codes are closed upward (a locked block's district and state are locked too), so keeping
 * them at each level is enough to keep every locked child.
 */
export function useGeographySelection({
  value,
  onChange,
  allowed,
  locked,
  onCascadeRemoval,
}: GeographySelectionOptions) {
  const { t } = useTranslate();
  const { data: hierarchy, isLoading } = useBoundaryTree();

  const selectedStateCodes = useMemo(() => codesOf(value.states), [value.states]);
  const selectedDistrictCodes = useMemo(() => codesOf(value.districts), [value.districts]);
  const selectedBlockCodes = useMemo(() => codesOf(value.blocks), [value.blocks]);

  const allowedCodes = useMemo(
    () =>
      allowed
        ? new Set([...codesOf(allowed.states), ...codesOf(allowed.districts), ...codesOf(allowed.blocks)])
        : undefined,
    [allowed],
  );

  const tree = useMemo(() => {
    const isAllowed = (code: string) => !allowedCodes || allowedCodes.has(code);
    const localized = <T extends MultiSelectOption>(entry: T) => ({
      ...entry,
      name: translateOr(t, `BOUNDARY_${entry.code}`, entry.name),
    });
    return {
      states: (hierarchy?.states ?? []).filter((state) => isAllowed(state.code)).map(localized),
      districts: (hierarchy?.districts ?? []).filter((district) => isAllowed(district.code)).map(localized),
      blocks: (hierarchy?.blocks ?? []).filter((block) => isAllowed(block.code)).map(localized),
    };
  }, [hierarchy, allowedCodes, t]);

  /** `codes` plus any locked code from `current` the caller tried to drop. */
  function keepLocked(codes: string[], current: string[]): string[] {
    const kept = current.filter((code) => locked?.has(code) && !codes.includes(code));
    return kept.length ? [...codes, ...kept] : codes;
  }

  function emit(stateCodes: string[], districtCodes: string[], blockCodes: string[]) {
    const districts = tree.districts.filter(
      (district) => districtCodes.includes(district.code) && stateCodes.includes(district.stateCode),
    );
    const keptDistrictCodes = districts.map((district) => district.code);
    const blocks = tree.blocks.filter(
      (block) => blockCodes.includes(block.code) && keptDistrictCodes.includes(block.districtCode),
    );
    if (districts.length < districtCodes.length || blocks.length < blockCodes.length) onCascadeRemoval?.();
    onChange({
      states: stateCodes.map((code) => ({ code })),
      districts: districts.map(({ code, stateCode }) => ({ code, stateCode })),
      blocks: blocks.map(({ code, districtCode, stateCode }) => ({ code, districtCode, stateCode })),
    });
  }

  function level(
    options: MultiSelectOption[],
    selectedCodes: string[],
    allOfLevel: MultiSelectOption[],
    onLevelChange: (codes: string[]) => void,
  ): GeographyLevel {
    return {
      options,
      selectedCodes,
      selectedItems: allOfLevel.filter((entry) => selectedCodes.includes(entry.code)),
      onChange: (codes) => onLevelChange(keepLocked(codes, selectedCodes)),
    };
  }

  return {
    isLoading,
    states: level(tree.states, selectedStateCodes, tree.states, (codes) =>
      emit(codes, selectedDistrictCodes, selectedBlockCodes),
    ),
    districts: level(
      tree.districts.filter((district) => selectedStateCodes.includes(district.stateCode)),
      selectedDistrictCodes,
      tree.districts,
      (codes) => emit(selectedStateCodes, codes, selectedBlockCodes),
    ),
    blocks: level(
      tree.blocks.filter((block) => selectedDistrictCodes.includes(block.districtCode)),
      selectedBlockCodes,
      tree.blocks,
      (codes) => emit(selectedStateCodes, selectedDistrictCodes, codes),
    ),
  };
}
