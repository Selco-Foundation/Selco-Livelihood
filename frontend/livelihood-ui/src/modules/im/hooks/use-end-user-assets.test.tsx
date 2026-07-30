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

describe("useEndUserAssets", () => {
  it("does not query when enabled is false", () => {
    const searchSpy = vi.spyOn(facilityService, "searchFacilitiesByJurisdiction");

    renderHook(() => useEndUserAssets({ enabled: false }), { wrapper: createWrapper() });

    expect(searchSpy).not.toHaveBeenCalled();
  });

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
