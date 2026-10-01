import { describe, expect, it, vi } from "vitest";
import { resolveStateNames, resolveStates } from "./geography";
import type { GeographyDetails } from "../types/project";

describe("resolveStates", () => {
  it("returns the states[] array when present", () => {
    const geography: GeographyDetails = { states: [{ code: "KA" }, { code: "AS" }] };
    expect(resolveStates(geography)).toEqual([{ code: "KA" }, { code: "AS" }]);
  });

  it("falls back to the legacy singular state object when states[] is absent", () => {
    const geography: GeographyDetails = { state: { code: "KA" } };
    expect(resolveStates(geography)).toEqual([{ code: "KA" }]);
  });

  it("prefers states[] over the legacy state field when both are present", () => {
    const geography: GeographyDetails = { states: [{ code: "AS" }], state: { code: "KA" } };
    expect(resolveStates(geography)).toEqual([{ code: "AS" }]);
  });

  it("returns [] when states[] is empty and no legacy state is present", () => {
    const geography: GeographyDetails = { states: [] };
    expect(resolveStates(geography)).toEqual([]);
  });

  it("returns [] when geography is undefined", () => {
    expect(resolveStates(undefined)).toEqual([]);
  });
});

describe("resolveStateNames", () => {
  it("translates each state via the BOUNDARY_<code> key", () => {
    const t = vi.fn((key: string) => (key === "BOUNDARY_KA" ? "Karnataka" : key));
    const geography: GeographyDetails = { states: [{ code: "KA" }] };

    expect(resolveStateNames(geography, t)).toEqual(["Karnataka"]);
  });

  it("falls back to the state's own name when translation is missing", () => {
    const t = vi.fn((key: string) => key);
    const geography: GeographyDetails = { states: [{ code: "AS", name: "Assam" }] };

    expect(resolveStateNames(geography, t)).toEqual(["Assam"]);
  });

  it("falls back to the raw code when both translation and name are missing", () => {
    const t = vi.fn((key: string) => key);
    const geography: GeographyDetails = { states: [{ code: "ML" }] };

    expect(resolveStateNames(geography, t)).toEqual(["ML"]);
  });

  it("maps multiple states in order", () => {
    const t = vi.fn((key: string) => key);
    const geography: GeographyDetails = { states: [{ code: "KA" }, { code: "AS" }, { code: "ML" }] };

    expect(resolveStateNames(geography, t)).toEqual(["KA", "AS", "ML"]);
  });
});
