import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore } from "@/test/mocks/auth";
import * as mdmsApi from "../api/mdms";
import { useLanguages } from "./use-languages";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("useLanguages", () => {
  it("returns the fallback (English) while the query hasn't resolved yet", () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useLanguages(), { wrapper: createWrapper() });

    expect(result.current).toEqual([{ code: "en_IN", label: "English", nativeLabel: "English" }]);
  });

  it("returns the fallback when the resolved data is an empty array (not just undefined)", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);

    const { result } = renderHook(() => useLanguages(), { wrapper: createWrapper() });

    await waitFor(() => expect(mdmsApi.fetchLanguages).toHaveBeenCalled());
    // Give react-query a tick to settle the resolved (empty) data.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toEqual([{ code: "en_IN", label: "English", nativeLabel: "English" }]);
  });

  it("returns the fetched languages once they resolve", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);

    const { result } = renderHook(() => useLanguages(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(result.current).toEqual([{ code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" }]),
    );
  });
});
