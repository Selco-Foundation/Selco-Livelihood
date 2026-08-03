/**
 * Unit tests for `useJurisdictionStore` (src/shared/stores/jurisdiction-store.ts).
 *
 * Covers:
 *  - Initial state: `boundaries` and `hrmsUser` both start as `null`.
 *  - `setJurisdictionData({ boundaries, hrmsUser })`: writes both fields onto
 *    the store together (it is the only way to populate them).
 *  - `clearJurisdiction()`: resets both fields back to `null`, independent of
 *    whatever was previously set.
 *  - Persistence: the store is wrapped in zustand's `persist` middleware with
 *    `createJSONStorage(() => localStorage)` under the key
 *    "livelihood-jurisdiction", so every `set` call should also be reflected
 *    in `localStorage` as JSON.
 *
 * Testing approach: no provider wrapper is used because zustand stores are
 * plain modules — `useJurisdictionStore.getState()` / `.setState()` give
 * direct access to state and actions without rendering any React tree, the
 * same pattern used by the sibling auth-store/locale-store/ui-store tests.
 * localStorage is real (jsdom provides a working implementation) rather than
 * mocked, since exercising the actual persist round-trip is the behavior
 * worth verifying for this file. `afterEach` resets both the in-memory store
 * state and `localStorage` so tests don't leak into one another (persisted
 * writes from one test would otherwise still be readable by the next).
 */
import { afterEach, describe, expect, it } from "vitest";
import type { HrmsEmployee } from "../api/hrms";
import type { JurisdictionBoundaries } from "../utils/boundary-util";
import { useJurisdictionStore } from "./jurisdiction-store";

const STORAGE_KEY = "livelihood-jurisdiction";

const sampleBoundaries: JurisdictionBoundaries = {
  district: ["district-1"],
  block: ["block-1", "block-2"],
};

const sampleHrmsUser: HrmsEmployee = {
  code: "EMP-1",
  jurisdictions: [{ boundaryType: "District", boundary: "district-1" }],
};

afterEach(() => {
  // Shallow merge (not `replace: true`) so the action functions
  // (setJurisdictionData/clearJurisdiction) stay attached to the store.
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  localStorage.removeItem(STORAGE_KEY);
});

describe("useJurisdictionStore", () => {
  it("starts with boundaries and hrmsUser both null", () => {
    expect(useJurisdictionStore.getState()).toMatchObject({
      boundaries: null,
      hrmsUser: null,
    });
  });

  // setJurisdictionData is the only writer the store exposes for populating
  // jurisdiction data; it must set boundaries and hrmsUser together from a
  // single object argument, not as two independent setters.
  describe("setJurisdictionData", () => {
    it("sets both boundaries and hrmsUser from the given payload", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: sampleBoundaries,
        hrmsUser: sampleHrmsUser,
      });

      expect(useJurisdictionStore.getState().boundaries).toEqual(sampleBoundaries);
      expect(useJurisdictionStore.getState().hrmsUser).toEqual(sampleHrmsUser);
    });

    it("overwrites a previously set value with the new payload", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: sampleBoundaries,
        hrmsUser: sampleHrmsUser,
      });

      const nextBoundaries: JurisdictionBoundaries = { state: ["state-1"] };
      const nextHrmsUser: HrmsEmployee = { code: "EMP-2" };
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: nextBoundaries,
        hrmsUser: nextHrmsUser,
      });

      expect(useJurisdictionStore.getState().boundaries).toEqual(nextBoundaries);
      expect(useJurisdictionStore.getState().hrmsUser).toEqual(nextHrmsUser);
    });

    // The store is wrapped in zustand's `persist` middleware writing to
    // localStorage under STORAGE_KEY; a real write must be reflected there
    // as JSON so a page reload can rehydrate the same jurisdiction data.
    it("persists the updated state to localStorage under the configured key", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: sampleBoundaries,
        hrmsUser: sampleHrmsUser,
      });

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw as string);
      expect(parsed.state.boundaries).toEqual(sampleBoundaries);
      expect(parsed.state.hrmsUser).toEqual(sampleHrmsUser);
    });
  });

  // clearJurisdiction resets both fields to null regardless of what was
  // previously stored, e.g. on logout when jurisdiction context must not
  // leak into the next session.
  describe("clearJurisdiction", () => {
    it("resets boundaries and hrmsUser back to null", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: sampleBoundaries,
        hrmsUser: sampleHrmsUser,
      });

      useJurisdictionStore.getState().clearJurisdiction();

      expect(useJurisdictionStore.getState()).toMatchObject({
        boundaries: null,
        hrmsUser: null,
      });
    });

    it("is a no-op on already-cleared state", () => {
      useJurisdictionStore.getState().clearJurisdiction();

      expect(useJurisdictionStore.getState()).toMatchObject({
        boundaries: null,
        hrmsUser: null,
      });
    });

    it("also updates the persisted localStorage entry to null values", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: sampleBoundaries,
        hrmsUser: sampleHrmsUser,
      });
      useJurisdictionStore.getState().clearJurisdiction();

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw as string);
      expect(parsed.state.boundaries).toBeNull();
      expect(parsed.state.hrmsUser).toBeNull();
    });
  });
});
