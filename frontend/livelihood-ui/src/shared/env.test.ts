/**
 * Unit tests for the Vite environment variable reader in src/shared/env.ts
 *
 * Covers:
 * - getViteEnv() behavior when a key is present in import.meta.env
 * - getViteEnv() fallback behavior when a key is missing
 * - Default fallback value ("") when no second argument is provided
 *
 * Approach: Direct function calls with dynamic key lookups to test the missing-value branch.
 * Known env var VITE_STATE_LEVEL_TENANT_ID is set by the repo's .env file.
 */
import { describe, expect, it } from "vitest";
import { getViteEnv } from "./env";

describe("getViteEnv", () => {
  /**
   * Reads a Vite environment variable from import.meta.env, returning the value
   * if present or a fallback string (default "") if not.
   * Uses dynamic lookups to exercise both present and missing branches.
   */
  it("returns the value from import.meta.env when the key is present", () => {
    // The repo's .env defines this for real, so it's genuinely present at test time.
    expect(getViteEnv("VITE_STATE_LEVEL_TENANT_ID")).toBe("livelihood");
  });

  it("returns the fallback when the key isn't set in the env", () => {
    // Cast: readViteEnv()[key] is a dynamic lookup, so an arbitrary unset
    // key exercises the missing-value branch without fighting Vite's
    // static inlining of known VITE_* keys referenced by literal name.
    expect(getViteEnv("VITE_NOT_A_REAL_KEY" as never, "default-tenant")).toBe(
      "default-tenant",
    );
  });

  it("defaults the fallback to an empty string when omitted", () => {
    expect(getViteEnv("VITE_NOT_A_REAL_KEY" as never)).toBe("");
  });
});
