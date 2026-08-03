/**
 * Unit tests for the useFacility hook in src/shared/hooks/use-facility.ts
 *
 * Covers:
 * - Query is disabled when employeeTenantId is missing, even with a valid token
 * - Query is disabled when boundaryCodes array is empty
 * - Query fetches facilities when authenticated with both tenant ID and codes
 *
 * Approach: Wrapped with QueryClientProvider to test react-query behavior.
 * Uses auth store mocks to control preconditions and facility API spies to verify fetches.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as facilityApi from "../api/facility";
import { useFacility } from "./use-facility";

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

describe("useFacility", () => {
  /**
   * Hook fetches a paginated list of facilities matching supplied boundary codes
   * when authenticated with both an access token and an employeeTenantId.
   * Query is disabled if either precondition is missing.
   */
  it("does not fetch when there is no employeeTenantId, even with a token", () => {
    seedAuthenticatedSession({ tenantId: undefined });
    const fetchSpy = vi.spyOn(facilityApi, "fetchFacilities");

    renderHook(() => useFacility(["B1"]), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not fetch when boundaryCodes is empty", () => {
    seedAuthenticatedSession({ tenantId: "livelihood" });
    const fetchSpy = vi.spyOn(facilityApi, "fetchFacilities");

    renderHook(() => useFacility([]), { wrapper: createWrapper() });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches facilities once authenticated with a tenant and codes", async () => {
    seedAuthenticatedSession({ tenantId: "livelihood" });
    vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({
      facilities: [{ boundaryCode: "B1", facilityId: "F1" }],
      total: 1,
    });

    const { result } = renderHook(() => useFacility(["B1"]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data?.total).toBe(1);
  });
});
