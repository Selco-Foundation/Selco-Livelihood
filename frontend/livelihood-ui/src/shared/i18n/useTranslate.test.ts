import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockUseTranslation = vi.fn();
vi.mock("react-i18next", () => ({
  useTranslation: (ns?: string) => mockUseTranslation(ns),
}));

vi.mock("./locale-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./locale-utils")>();
  return {
    ...actual,
    sortDropdownNames: vi.fn(actual.sortDropdownNames),
  };
});

import { sortDropdownNames } from "./locale-utils";
import { useTranslate } from "./useTranslate";

const mockedSortDropdownNames = vi.mocked(sortDropdownNames);

function setup(t: (key: string) => string, ready = true) {
  const i18n = { language: "en_IN" };
  mockUseTranslation.mockReturnValue({ t, i18n, ready });
  return { i18n };
}

describe("useTranslate", () => {
  it("uses the default 'translations' namespace when none is given", () => {
    setup((key) => key);
    renderHook(() => useTranslate());
    expect(mockUseTranslation).toHaveBeenCalledWith("translations");
  });

  it("forwards a custom namespace to useTranslation", () => {
    setup((key) => key);
    renderHook(() => useTranslate("custom-ns"));
    expect(mockUseTranslation).toHaveBeenCalledWith("custom-ns");
  });

  it("passes through t, ready, and i18n from useTranslation", () => {
    const t = (key: string) => key;
    const { i18n } = setup(t, false);
    const { result } = renderHook(() => useTranslate());
    expect(result.current.t).toBe(t);
    expect(result.current.ready).toBe(false);
    expect(result.current.i18n).toBe(i18n);
  });

  it("exposes the locale-utils helper functions unchanged", () => {
    setup((key) => key);
    const { result } = renderHook(() => useTranslate());
    expect(result.current.getTransformedLocale("hello world")).toBe("HELLO_WORLD");
    expect(result.current.toTenantLocale("pb.amritsar")).toBe("PB_AMRITSAR");
  });

  it("binds sortDropdownNames to the current t function", () => {
    const t = vi.fn((key: string) => key);
    setup(t);
    const { result } = renderHook(() => useTranslate());

    const options = [{ i18nKey: "B" }, { i18nKey: "A" }];
    // UseTranslateResult types this as `typeof sortDropdownNames` (options, optionKey, t),
    // even though the hook's own wrapper only reads the first two arguments and binds `t`
    // itself (see useTranslate.ts's `sortDropdownNames: (options, optionKey) => ...`) — so a
    // 3rd argument is required here to satisfy the type, but is ignored at runtime.
    result.current.sortDropdownNames(options, "i18nKey", t);

    expect(mockedSortDropdownNames).toHaveBeenCalledWith(options, "i18nKey", t);
  });
});
