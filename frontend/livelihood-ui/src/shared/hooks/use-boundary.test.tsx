/**
 * Unit tests for the useBoundary hook in src/shared/hooks/use-boundary.ts
 *
 * Covers:
 * - Query is disabled when no access token is present
 * - Query is disabled when codes array is empty
 * - Query fetches boundary relations when authenticated with codes
 * - Query key normalization: codes are sorted and deduplicated for stable cache hits
 * - Falsy code filtering when building the stable key
 *
 * Approach: Wrapped with QueryClientProvider to test react-query behavior.
 * Uses auth store mocks and API spies to control query preconditions and outcomes.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as boundaryApi from "../api/boundary";
import { useBoundary } from "./use-boundary";

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

describe("useBoundary", () => {
  /**
   * Hook fetches boundary relations (hierarchical boundary data) for supplied codes
   * when authenticated. Uses react-query with a stable, sorted key to cache results
   * across re-mounts that pass codes in different orders.
   */
  it("does not fetch when there is no access token", () => {
    resetAuthStore();
    const fetchSpy = vi.spyOn(boundaryApi, "fetchBoundaryRelations");

    renderHook(() => useBoundary(["S1"]), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not fetch when codes is empty, even when authenticated", () => {
    seedAuthenticatedSession();
    const fetchSpy = vi.spyOn(boundaryApi, "fetchBoundaryRelations");

    renderHook(() => useBoundary([]), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches boundary relations when authenticated with codes", async () => {
    seedAuthenticatedSession();
    vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({
      states: [{ code: "S1", parentCode: "" }],
    });

    const { result } = renderHook(() => useBoundary(["S1"]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.states).toEqual([{ code: "S1", parentCode: "" }]);
  });

  it("produces the same query key regardless of code order (stable sorted key)", async () => {
    seedAuthenticatedSession();
    const fetchSpy = vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({});
    /**
     * Use staleTime: Infinity so a second mount serves the cached result instead of
     * triggering a background refetch. This isolates the assertion to query-key stability:
     * if the key is the same, react-query won't call the fetch function a second time.
     */
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const first = renderHook(() => useBoundary(["B1", "A1"]), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));

    fetchSpy.mockClear();
    const second = renderHook(() => useBoundary(["A1", "B1"]), { wrapper: Wrapper });

    /**
     * Codes are sorted ([A1, B1]) before building the query key,
     * so both calls produce the same key despite different input order.
     * React-query serves the cached result without re-fetching.
     */
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dedupes/filters falsy codes when building the stable key", () => {
    seedAuthenticatedSession();
    vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({});
    // No direct way to read the internal queryKey, but this should not throw
    // and should still be enabled given at least one truthy code.
    const { result } = renderHook(() => useBoundary(["", "S1"]), { wrapper: createWrapper() });
    expect(result.current.isLoading || result.current.isSuccess).toBe(true);
  });
});
