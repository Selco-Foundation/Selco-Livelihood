/**
 * Unit tests for the locale state store (Zustand).
 *
 * Covers: useLocaleStore state (locale) and methods (setLocale).
 * Testing approach: Direct store state access and mutation via getState().method(...).
 * No provider wrapper needed as this is a direct Zustand store access.
 */
import { describe, expect, it } from "vitest";
import { useLocaleStore } from "./locale-store";

/**
 * useLocaleStore: Zustand store for the currently active locale, initialized from localStorage
 * (via readActiveLocale()) at module load. Provides setLocale method to update the locale.
 */
describe("useLocaleStore", () => {
  it("initializes locale from readActiveLocale() at module load", () => {
    expect(typeof useLocaleStore.getState().locale).toBe("string");
    expect(useLocaleStore.getState().locale.length).toBeGreaterThan(0);
  });

  it("updates the locale via setLocale", () => {
    useLocaleStore.getState().setLocale("kn_IN");
    expect(useLocaleStore.getState().locale).toBe("kn_IN");
  });
});
