import { afterEach, describe, expect, it } from "vitest";
import type { HrmsEmployee } from "../api/hrms";
import type { JurisdictionBoundaries } from "../utils/boundary-util";
import { useJurisdictionStore } from "./jurisdiction-store";

const initialState = useJurisdictionStore.getState();

afterEach(() => {
  useJurisdictionStore.setState(initialState, true);
  window.localStorage.clear();
});

describe("useJurisdictionStore", () => {
  it("starts with no boundaries or hrms user", () => {
    const state = useJurisdictionStore.getState();

    expect(state.boundaries).toBeNull();
    expect(state.hrmsUser).toBeNull();
  });

  describe("setJurisdictionData", () => {
    it("sets boundaries and hrmsUser together", () => {
      const boundaries: JurisdictionBoundaries = { district: ["d1"], block: ["b1", "b2"] };
      const hrmsUser: HrmsEmployee = { code: "EMP-1", user: { uuid: "u-1", name: "Jane" } };

      useJurisdictionStore.getState().setJurisdictionData({ boundaries, hrmsUser });

      const state = useJurisdictionStore.getState();
      expect(state.boundaries).toEqual(boundaries);
      expect(state.hrmsUser).toEqual(hrmsUser);
    });

    it("persists the data to localStorage under the livelihood-jurisdiction key", () => {
      const boundaries: JurisdictionBoundaries = { district: ["d1"] };
      const hrmsUser: HrmsEmployee = { code: "EMP-1" };

      useJurisdictionStore.getState().setJurisdictionData({ boundaries, hrmsUser });

      const stored = window.localStorage.getItem("livelihood-jurisdiction");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored ?? "{}");
      expect(parsed.state.boundaries).toEqual(boundaries);
      expect(parsed.state.hrmsUser).toEqual(hrmsUser);
    });
  });

  describe("clearJurisdiction", () => {
    it("resets boundaries and hrmsUser back to null", () => {
      useJurisdictionStore.getState().setJurisdictionData({
        boundaries: { district: ["d1"] },
        hrmsUser: { code: "EMP-1" },
      });

      useJurisdictionStore.getState().clearJurisdiction();

      const state = useJurisdictionStore.getState();
      expect(state.boundaries).toBeNull();
      expect(state.hrmsUser).toBeNull();
    });
  });
});
