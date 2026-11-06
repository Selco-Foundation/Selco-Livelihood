import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore, useJurisdictionStore } from "@/shared";
import { useEndUserAssets } from "./use-end-user-assets";
import type { LivelihoodAsset, LivelihoodFacility } from "../types/facility-asset";

vi.mock("../services/asset-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/asset-search")>();
  return { ...actual, searchAssetsForFacility: vi.fn() };
});
vi.mock("../services/facility-search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/facility-search")>();
  return { ...actual, searchFacilitiesByJurisdiction: vi.fn() };
});
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, fetchFileUrls: vi.fn() };
});

import { fetchFileUrls } from "@/shared";
import { searchAssetsForFacility } from "../services/asset-search";
import { searchFacilitiesByJurisdiction } from "../services/facility-search";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

const authedUser = { uuid: "user-1", roles: [{ code: "COMPLAINANT" }] };

const facility: LivelihoodFacility = {
  tenantId: "tenant-1",
  facilityId: "fac-1",
  facilityPocName: "Facility A",
  boundaryCode: "B1",
};

function asset(overrides: Partial<LivelihoodAsset> = {}): LivelihoodAsset {
  return {
    assetId: "a1",
    tenantId: "tenant-1",
    facilityId: "fac-1",
    boundaryCode: "B1",
    assetTypeId: "PANEL",
    name: "Panel",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(searchAssetsForFacility).mockReset();
  vi.mocked(searchFacilitiesByJurisdiction).mockReset();
  vi.mocked(fetchFileUrls).mockReset();
  useJurisdictionStore.setState({ boundaries: { district: ["D1"], block: ["B1"] } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

describe("useEndUserAssets", () => {
  it("does not query when enabled is false", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useEndUserAssets({ enabled: false }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchFacilitiesByJurisdiction).not.toHaveBeenCalled();
    expect(result.current.assets).toEqual([]);
  });

  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1", user: authedUser }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null, user: authedUser }],
  ])("does not query when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchFacilitiesByJurisdiction).not.toHaveBeenCalled();
  });

  it("builds jurisdiction search criteria from the boundaries store and returns [] when no facility is found", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [], total: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(searchFacilitiesByJurisdiction).toHaveBeenCalledWith(
      { limit: 100, offset: 0, isOnmReady: false, tenantId: ["tenant-1"], district: ["D1"], block: ["B1"] },
      "token-1",
      authedUser,
    );
    expect(searchAssetsForFacility).not.toHaveBeenCalled();
    expect(result.current.assets).toEqual([]);
  });

  it("resolves asset image URLs, deduping repeated fileStoreIds and leaving assets without one untouched", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [facility], total: 1 });
    vi.mocked(searchAssetsForFacility).mockResolvedValue([
      asset({ assetId: "a1", documentFileStoreId: "fs1" }),
      asset({ assetId: "a2", documentFileStoreId: "fs1" }),
      asset({ assetId: "a3" }),
    ]);
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs1", url: "https://cdn/fs1" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(searchAssetsForFacility).toHaveBeenCalledWith("fac-1", "tenant-1", "token-1", authedUser);
    expect(fetchFileUrls).toHaveBeenCalledWith(["fs1"], "tenant-1", "token-1", authedUser);
    expect(result.current.assets).toEqual([
      expect.objectContaining({ assetId: "a1", imageUrl: "https://cdn/fs1" }),
      expect.objectContaining({ assetId: "a2", imageUrl: "https://cdn/fs1" }),
      expect.objectContaining({ assetId: "a3", imageUrl: undefined }),
    ]);
  });

  it("skips fetchFileUrls entirely when no asset carries a documentFileStoreId", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchFacilitiesByJurisdiction).mockResolvedValue({ facilities: [facility], total: 1 });
    vi.mocked(searchAssetsForFacility).mockResolvedValue([asset({ assetId: "a1" })]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useEndUserAssets({ enabled: true }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchFileUrls).not.toHaveBeenCalled();
    expect(result.current.assets).toEqual([asset({ assetId: "a1" })]);
  });
});
