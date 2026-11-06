import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  loadModules: vi.fn(),
}));

import { loadModules } from "./index";
import { useModuleI18n } from "./useModuleI18n";

const mockedLoadModules = vi.mocked(loadModules);

describe("useModuleI18n", () => {
  beforeEach(() => {
    mockedLoadModules.mockReset();
  });

  it("starts in a loading state", () => {
    mockedLoadModules.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useModuleI18n("im"));
    expect(result.current.isLoading).toBe(true);
  });

  it("loads the rainmaker-prefixed, lowercased module for the given code", () => {
    mockedLoadModules.mockResolvedValue(undefined);
    renderHook(() => useModuleI18n("IM"));
    expect(mockedLoadModules).toHaveBeenCalledWith(["rainmaker-im"]);
  });

  it("flips to not-loading once the module load resolves", async () => {
    mockedLoadModules.mockResolvedValue(undefined);
    const { result } = renderHook(() => useModuleI18n("ir"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("reloads when the module code changes", async () => {
    mockedLoadModules.mockResolvedValue(undefined);
    const { result, rerender } = renderHook(({ moduleCode }) => useModuleI18n(moduleCode), {
      initialProps: { moduleCode: "im" },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    mockedLoadModules.mockClear();
    rerender({ moduleCode: "ir" });

    expect(mockedLoadModules).toHaveBeenCalledWith(["rainmaker-ir"]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
