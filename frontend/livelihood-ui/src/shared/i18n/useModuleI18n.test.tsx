// Import the barrel first: it re-exports stores/locale-store.ts before the
// i18n submodules, which resolves a circular import between
// shared/i18n/locale-persistence.ts and shared/stores/locale-store.ts in a
// safe order. Importing shared/i18n/index.ts directly first (bypassing the
// barrel) hits a TDZ error on ACTIVE_LOCALE_KEY due to that same cycle.
import "@/shared";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as i18nIndex from "./index";
import { useModuleI18n } from "./useModuleI18n";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useModuleI18n", () => {
  it("starts in a loading state", () => {
    vi.spyOn(i18nIndex, "loadModules").mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useModuleI18n("im"));
    expect(result.current.isLoading).toBe(true);
  });

  it("finishes loading once loadModules resolves, using the lower-cased rainmaker-prefixed module name", async () => {
    const loadModulesSpy = vi.spyOn(i18nIndex, "loadModules").mockResolvedValue(undefined);

    const { result } = renderHook(() => useModuleI18n("IM"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(loadModulesSpy).toHaveBeenCalledWith(["rainmaker-im"]);
  });

  it("reloads when moduleCode changes", async () => {
    const loadModulesSpy = vi.spyOn(i18nIndex, "loadModules").mockResolvedValue(undefined);

    const { rerender } = renderHook(({ moduleCode }) => useModuleI18n(moduleCode), {
      initialProps: { moduleCode: "im" },
    });
    await waitFor(() => expect(loadModulesSpy).toHaveBeenCalledWith(["rainmaker-im"]));

    rerender({ moduleCode: "core" });
    await waitFor(() => expect(loadModulesSpy).toHaveBeenCalledWith(["rainmaker-core"]));
  });
});
