import type { AuthUser } from "@/shared";
import { buildDummyAmcSchedules } from "../constants/dummy-amc-schedules";
import type { AmcScheduleSearchResponse, RawAmcSchedule } from "../types/amc";

/** localStorage key for the prototype's saved AMC schedules (planId → schedules). */
export const AMC_SCHEDULES_STORAGE_KEY = "livelihood-ui.amc-prototype.schedules.v1";

type StoredSchedules = Record<string, RawAmcSchedule[]>;

// Prototype store: saved edits live in this browser's localStorage only, so they survive a reload
// and show up in other tabs. Falls back to the seed whenever storage is unavailable or unreadable.
function readStore(): StoredSchedules {
  try {
    const raw = window.localStorage.getItem(AMC_SCHEDULES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSchedules) : {};
  } catch {
    return {};
  }
}

function writeStore(store: StoredSchedules) {
  try {
    window.localStorage.setItem(AMC_SCHEDULES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage blocked or full: the save still returns, it just won't persist.
  }
}

/**
 * Static until the AMC configuration search API exists. Swap-over: replace the body with
 * `apiClient.post("/asset-amc/v1/configuration/_search", { RequestInfo: createRequestInfo(accessToken, user), ... })`
 * and return its response.
 */
export async function searchAmcSchedules(
  fieldPlanId: string,
  _accessToken?: string,
  _user?: AuthUser | null,
): Promise<AmcScheduleSearchResponse> {
  return { AmcSchedules: readStore()[fieldPlanId] ?? buildDummyAmcSchedules(fieldPlanId) };
}

/**
 * Static until the AMC configuration update API exists. Swap-over: replace the body with
 * `apiClient.post("/asset-amc/v1/configuration/_update", { RequestInfo: ..., AmcConfigurations: schedules })`.
 */
export async function updateAmcSchedules(
  fieldPlanId: string,
  schedules: RawAmcSchedule[],
  _accessToken?: string,
  _user?: AuthUser | null,
): Promise<AmcScheduleSearchResponse> {
  writeStore({ ...readStore(), [fieldPlanId]: schedules });
  return { AmcSchedules: structuredClone(schedules) };
}

/** Prototype helper: forgets every saved edit, back to the seed data. */
export function resetStaticAmcSchedules() {
  try {
    window.localStorage.removeItem(AMC_SCHEDULES_STORAGE_KEY);
  } catch {
    // Nothing stored to clear.
  }
}
