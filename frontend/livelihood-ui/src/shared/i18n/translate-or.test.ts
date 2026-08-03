/**
 * Unit tests for the translateOr utility in src/shared/i18n/translate-or.ts
 *
 * Covers:
 * - Returns translated value when the key is found (i18next returns a different value)
 * - Returns fallback when key is missing (i18next echoes the key back as a signal)
 *
 * Approach: Direct function calls with mock translator function to test both branches.
 */
import { describe, expect, it } from "vitest";
import { translateOr } from "./translate-or";

describe("translateOr", () => {
  /**
   * Attempts to translate a key using the provided translator function.
   * Returns the fallback if the translator echoes the key back unchanged
   * (the i18next convention for missing translations).
   * Otherwise returns the translated value.
   */
  it("returns the translated value when the key resolves to something other than itself", () => {
    const t = (key: string) => (key === "GREETING" ? "Hello" : key);

    expect(translateOr(t, "GREETING", "fallback")).toBe("Hello");
  });

  it("returns the fallback when i18next echoes the key back (its missing-translation convention)", () => {
    const t = (key: string) => key;

    expect(translateOr(t, "UNKNOWN_KEY", "Fallback Text")).toBe("Fallback Text");
  });
});
