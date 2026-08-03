/**
 * Unit tests for locale persistence in src/shared/i18n/locale-persistence.ts
 *
 * Covers:
 * - persistActiveLocale: updates locale store and writes to localStorage
 * - persistActiveLocale: silently ignores localStorage quota exceeded errors
 * - readActiveLocale: retrieves persisted locale from localStorage
 * - readActiveLocale: falls back to default language when nothing is persisted
 *
 * Approach: Direct function calls with localStorage mocking and locale store verification.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../stores/locale-store";
import { getDefaultLanguage } from "./locale-utils";
import { persistActiveLocale, readActiveLocale } from "./locale-persistence";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("persistActiveLocale", () => {
  /**
   * Updates the global locale store and attempts to write the locale code to localStorage
   * under key "livelihood.locale". Silently ignores write failures (e.g., quota exceeded in
   * private mode) but still updates the store.
   */
  it("updates the locale store", () => {
    persistActiveLocale("kn_IN");
    expect(useLocaleStore.getState().locale).toBe("kn_IN");
  });

  it("writes the locale to localStorage", () => {
    persistActiveLocale("kn_IN");
    expect(window.localStorage.getItem("livelihood.locale")).toBe("kn_IN");
  });

  it("silently ignores a localStorage write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => persistActiveLocale("kn_IN")).not.toThrow();
    // The store update still happens even though the write failed.
    expect(useLocaleStore.getState().locale).toBe("kn_IN");
  });
});

describe("readActiveLocale", () => {
  /**
   * Reads the persisted locale from localStorage key "livelihood.locale",
   * falling back to the default language (from config) if not set.
   */
  it("returns the persisted locale when one exists", () => {
    window.localStorage.setItem("livelihood.locale", "kn_IN");
    expect(readActiveLocale()).toBe("kn_IN");
  });

  it("falls back to the default language when nothing is persisted", () => {
    expect(readActiveLocale()).toBe(getDefaultLanguage());
  });
});
