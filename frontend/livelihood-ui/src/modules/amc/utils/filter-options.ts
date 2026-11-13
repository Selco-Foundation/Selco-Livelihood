import type { AmcReport } from "../types/amc-report";

export interface AmcFilterOption {
  code: string;
  name: string;
}

export interface AmcFilterOptions {
  vendors: AmcFilterOption[];
  states: AmcFilterOption[];
  districts: AmcFilterOption[];
  blocks: AmcFilterOption[];
}

function toOptions(values: string[]): AmcFilterOption[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b)).map((value) => ({ code: value, name: value }));
}

/**
 * Filter options derived from the reports themselves (prototype: no boundary/vendor masters yet).
 * Districts follow the selected states and blocks follow the selected districts, like IR's cascade.
 */
export function buildAmcFilterOptions(
  reports: AmcReport[],
  selection: { states: string[]; districts: string[] },
): AmcFilterOptions {
  const inStates = reports.filter((report) => !selection.states.length || selection.states.includes(report.state));
  const inDistricts = inStates.filter(
    (report) => !selection.districts.length || selection.districts.includes(report.district),
  );
  return {
    vendors: toOptions(reports.map((report) => report.vendorName)),
    states: toOptions(reports.map((report) => report.state)),
    districts: toOptions(inStates.map((report) => report.district)),
    blocks: toOptions(inDistricts.map((report) => report.block)),
  };
}

/** Drops selected districts/blocks that no longer fit the narrowed parent selection. */
export function pruneAmcGeography<T extends { districts: string[]; blocks: string[] }>(
  filters: T,
  options: AmcFilterOptions,
): T {
  const districtCodes = new Set(options.districts.map((option) => option.code));
  const blockCodes = new Set(options.blocks.map((option) => option.code));
  return {
    ...filters,
    districts: filters.districts.filter((code) => districtCodes.has(code)),
    blocks: filters.blocks.filter((code) => blockCodes.has(code)),
  };
}
