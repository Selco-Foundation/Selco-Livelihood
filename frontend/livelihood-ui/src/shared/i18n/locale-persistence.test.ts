import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "../stores/locale-store";
import { persistActiveLocale, readActiveLocale } from "./locale-persistence";

const ACTIVE_LOCALE_KEY = "livelihood.locale";

describe("locale-persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.globalConfigs = { getConfig: () => undefined };
  });

  describe("persistActiveLocale", () => {
    it("writes the locale to localStorage", () => {
      persistActiveLocale("hi_IN");
      expect(window.localStorage.getItem(ACTIVE_LOCALE_KEY)).toBe("hi_IN");
    });

    it("updates the locale zustand store", () => {
      persistActiveLocale("hi_IN");
      expect(useLocaleStore.getState().locale).toBe("hi_IN");
    });

    it("swallows localStorage write failures", () => {
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota exceeded");
      });

      expect(() => persistActiveLocale("hi_IN")).not.toThrow();
      // The store update still happens even when the localStorage write fails.
      expect(useLocaleStore.getState().locale).toBe("hi_IN");

      setItemSpy.mockRestore();
    });
  });

  describe("readActiveLocale", () => {
    it("returns the stored locale when present", () => {
      window.localStorage.setItem(ACTIVE_LOCALE_KEY, "hi_IN");
      expect(readActiveLocale()).toBe("hi_IN");
    });

    it("falls back to the default language when nothing is stored", () => {
      expect(readActiveLocale()).toBe("en_IN");
    });
  });
});
