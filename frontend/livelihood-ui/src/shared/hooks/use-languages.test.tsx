/**
 * Unit tests for the useLanguages hook in src/shared/hooks/use-languages.ts
 *
 * Covers:
 * - Fallback to English when the query is still loading
 * - Fallback to English when the API returns an empty array
 * - Returning fetched languages once the query resolves with data
 *
 * Approach: Wrapped with QueryClientProvider to test react-query behavior.
 * Uses staleTime: Infinity to ensure data persists without refetch. MDMS API mocked
 * to control fetch timing and returned language data.
 */
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
  /**
   * Hook fetches supported languages from MDMS with a fallback to English.
   * Returns the fallback (not empty data) when the query is loading or when
   * the API returns an empty array.
   */
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
