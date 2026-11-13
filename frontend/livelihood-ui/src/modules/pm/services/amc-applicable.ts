import type { AmcApplicableValue } from "../components/steps/TechnicianAssignmentStep";

export const AMC_APPLICABLE_STORAGE_KEY = "livelihood-ui.amc-prototype.applicable.v1";

function readStore(): Record<string, AmcApplicableValue> {
  try {
    return JSON.parse(window.localStorage.getItem(AMC_APPLICABLE_STORAGE_KEY) ?? "{}") as Record<string, AmcApplicableValue>;
  } catch {
    return {};
  }
}

/**
 * Prototype: AMC applicable flags per installation plan, kept in localStorage so the PM can turn
 * them on after the plan is published. Swap for the real AMC configuration endpoint once it exists.
 */
export function getAmcApplicable(planId: string): AmcApplicableValue {
  return readStore()[planId] ?? {};
}

export function saveAmcApplicable(planId: string, value: AmcApplicableValue): void {
  try {
    window.localStorage.setItem(AMC_APPLICABLE_STORAGE_KEY, JSON.stringify({ ...readStore(), [planId]: value }));
  } catch {
    // Storage unavailable: the flags then only last for this visit.
  }
}
