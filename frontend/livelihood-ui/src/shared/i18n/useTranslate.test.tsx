/**
 * Unit tests for useTranslate hook.
 *
 * Covers: useTranslate() — returns translation function + locale utility functions.
 * Testing approach: Wraps the hook in a custom I18nextProvider with a fresh i18next instance
 * to isolate from the global i18n singleton. No mocking of i18next methods needed as we use
 * a real minimal i18next instance.
 */
import { renderHook } from "@testing-library/react";
import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import { useTranslate } from "./useTranslate";

function createWrapper() {
  const testI18n = i18next.createInstance();
  testI18n.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>;
  };
}

/**
 * useTranslate: React hook that exposes the i18next translation function (t), ready flag, i18n instance,
 * and locale utility functions (getTransformedLocale, convertToLocale, sortDropdownNames, etc.).
 * Binds sortDropdownNames to the hook's own t function so sorting respects current locale.
 */
describe("useTranslate", () => {
  it("exposes t/ready/i18n plus the locale helper functions", () => {
    const { result } = renderHook(() => useTranslate(), { wrapper: createWrapper() });

    expect(typeof result.current.t).toBe("function");
    expect(typeof result.current.getTransformedLocale).toBe("function");
    expect(typeof result.current.convertToLocale).toBe("function");
  });

  it("binds sortDropdownNames to the hook's own t function", () => {
    const { result } = renderHook(() => useTranslate(), { wrapper: createWrapper() });

    const sorted = result.current.sortDropdownNames(
      [{ i18nKey: "Zebra" }, { i18nKey: "Apple" }],
      "i18nKey",
    );

    expect(sorted.map((item) => item.i18nKey)).toEqual(["Apple", "Zebra"]);
  });
});
