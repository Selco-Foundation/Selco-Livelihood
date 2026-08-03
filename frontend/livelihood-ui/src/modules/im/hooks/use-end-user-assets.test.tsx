/**
 * Unit tests for `useEndUserAssets`.
 *
 * `useEndUserAssets` is a React Query hook used on the end-user side of the IM
 * module: given the current jurisdiction boundaries, it resolves the first
 * matching facility, fetches that facility's assets, and (when any asset
 * carries a `documentFileStoreId`) hydrates each asset with an `imageUrl`
 * resolved from the file store service. Because the hook composes three
 * network-backed services (`facility-search`, `asset-search`,
 * `incident-details`) plus the auth/jurisdiction Zustand stores, these tests
 * mock all three services with `vi.spyOn` and drive the hook through
 * `renderHook` inside a real `QueryClientProvider` wrapper (with `retry:
 * false` so failed queries don't slow down the tests). The auth store is
 * seeded with an authenticated session in `beforeEach` so the query's
 * `enabled` guard (which requires an access token and tenant id) is
 * satisfied, and both the auth and jurisdiction stores are reset between
 * tests to avoid state leaking across cases.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as facilityService from "../services/facility-search";
import * as assetService from "../services/asset-search";
import * as incidentDetailsService from "../services/incident-details";
import { useEndUserAssets } from "./use-end-user-assets";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  seedAuthenticatedSession({ tenantId: "livelihood" });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

// `useEndUserAssets({ enabled })` looks up the facility for the current
// jurisdiction boundaries, loads that facility's assets, and enriches any
// asset that has a `documentFileStoreId` with a resolved `imageUrl` (deduping
// file store ids before resolving them, since multiple assets can share one
// file). The underlying query only runs when `enabled` is true and both an
// access token and tenant id are present on the auth store.
describe("useEndUserAssets", () => {
  // `enabled: false` must short-circuit the query entirely so the hook does
  // not perform network calls (and does not require jurisdiction data) while
  // a caller is still deciding whether to fetch.
  it("does not query when enabled is false", () => {
    const searchSpy = vi.spyOn(facilityService, "searchFacilitiesByJurisdiction");

    renderHook(() => useEndUserAssets({ enabled: false }), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

  // When the jurisdiction search yields no facility, the hook must resolve
  // to an empty asset array rather than throwing or calling the asset/file
  // services (there is no facility id to search assets for).
  it("returns an empty array when no facility is found", async () => {
    vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
      facilities: [],
      total: 0,
    });

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.assets).toEqual([]);
  });

  // When none of the returned assets carry a `documentFileStoreId`, the hook
  // must skip the `fetchFileUrls` call entirely and return the assets as-is,
  // leaving `imageUrl` undefined instead of resolving anything.
  it("returns assets unchanged when none have a documentFileStoreId", async () => {
    vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
      facilities: [
        { tenantId: "livelihood", facilityId: "fac-1", facilityPocName: "Poc", boundaryCode: "B1" },
      ],
      total: 1,
    });
    vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([
      {
        assetId: "a1",
        tenantId: "livelihood",
        facilityId: "fac-1",
        boundaryCode: "B1",
        assetTypeId: "streetlight",
        name: "Streetlight 1",
      },
    ]);

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.assets).toHaveLength(1));
    expect(result.current.assets[0].imageUrl).toBeUndefined();
  });

  // Two assets sharing the same `documentFileStoreId` ("fs-1") should both
  // end up with the same resolved `imageUrl`, and `fetchFileUrls` is only
  // asked to resolve the deduped set of file store ids (not one per asset).
  // This exercises the `Set`-based dedup + `Map` lookup in the hook and
  // confirms the resolved URL is propagated back to every matching asset.
  it("attaches imageUrl by deduping fileStoreIds and resolving their original file urls", async () => {
    vi.spyOn(facilityService, "searchFacilitiesByJurisdiction").mockResolvedValue({
      facilities: [
        { tenantId: "livelihood", facilityId: "fac-1", facilityPocName: "Poc", boundaryCode: "B1" },
      ],
      total: 1,
    });
    vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([
      {
        assetId: "a1",
        tenantId: "livelihood",
        facilityId: "fac-1",
        boundaryCode: "B1",
        assetTypeId: "streetlight",
        name: "Streetlight 1",
        documentFileStoreId: "fs-1",
      },
      {
        assetId: "a2",
        tenantId: "livelihood",
        facilityId: "fac-1",
        boundaryCode: "B1",
        assetTypeId: "streetlight",
        name: "Streetlight 2",
        documentFileStoreId: "fs-1",
      },
    ]);
    vi.spyOn(incidentDetailsService, "fetchFileUrls").mockResolvedValue({
      fileStoreIds: [{ id: "fs-1", url: "https://cdn/img.jpg" }],
    });

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.assets[0]?.imageUrl).toBe("https://cdn/img.jpg"));
    expect(result.current.assets[1]?.imageUrl).toBe("https://cdn/img.jpg");
  });
});
