import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useActivityReview, useLoadSectionMedia, useSubmitActivityReview } from "./use-activity-review";
import type { ActivityFacilityRow, ReviewSectionContent } from "../types/activity-review";
import type { AssetSearchResponseItem } from "../services/asset";

vi.mock("../services/facility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/facility")>();
  return { ...actual, searchActivityFacilities: vi.fn() };
});
vi.mock("../services/asset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/asset")>();
  return { ...actual, searchAssetsForActivityFacility: vi.fn() };
});
vi.mock("../services/review", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/review")>();
  return { ...actual, submitFacilityReview: vi.fn() };
});
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, fetchFileUrls: vi.fn(), fetchMdmsMasters: vi.fn() };
});

import { fetchFileUrls, fetchMdmsMasters } from "@/shared";
import { searchActivityFacilities } from "../services/facility";
import { searchAssetsForActivityFacility } from "../services/asset";
import { submitFacilityReview } from "../services/review";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function row(overrides: Partial<ActivityFacilityRow["activityFacility"]> = {}): ActivityFacilityRow {
  return {
    activityFacility: {
      id: "act-1",
      facilityId: "fac-1",
      fieldPlanId: "plan-1",
      componentType: "SOLAR",
      status: "SUBMITTED_BY_FIELD_STAFF",
      facility: { facility_name: "Facility A", boundary: { district: "D1", block: "B1" } },
      ...overrides,
    },
  };
}

const panelAsset: AssetSearchResponseItem = {
  assetId: "asset-1",
  assetTypeID: "PANEL",
  serialNumber: "SN-1",
  documents: [{ documentType: "ASSET", fileStore: "fs1" }],
};

const authedUser = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

function mockMdmsMasters() {
  vi.mocked(fetchMdmsMasters).mockImplementation(async (_tenantId, moduleCode): Promise<Record<string, unknown[]>> => {
    if (moduleCode === "common-masters") {
      return {
        InstallationImages: [
          { InstallationImage: [{ code: "SITE_OVERVIEW", description: "Site overview photo" }] },
        ],
      };
    }
    return { RejectionReasons: [] };
  });
}

beforeEach(() => {
  vi.mocked(searchActivityFacilities).mockReset();
  vi.mocked(searchAssetsForActivityFacility).mockReset();
  vi.mocked(submitFacilityReview).mockReset();
  vi.mocked(fetchFileUrls).mockReset();
  vi.mocked(fetchMdmsMasters).mockReset();
  mockMdmsMasters();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
  vi.restoreAllMocks();
});

describe("useActivityReview", () => {
  it("builds a review detail from the facility row, resolving asset media URLs", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 1, facility: [row()] });
    vi.mocked(searchAssetsForActivityFacility).mockResolvedValue([panelAsset]);
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs1", url: "https://img/fs1" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityFacilities).toHaveBeenCalledWith(
      { tenantId: "tenant-1", ids: ["act-1"], activityCodes: ["INS"] },
      { limit: 1, offset: 0 },
      "token-1",
      authedUser,
    );
    expect(searchAssetsForActivityFacility).toHaveBeenCalledWith("act-1", "tenant-1", "token-1", authedUser);
    expect(fetchFileUrls).toHaveBeenCalledWith(["fs1"], "tenant-1", "token-1", authedUser);

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toBeDefined();
    expect(panelSection).toMatchObject({ kind: "ASSET", items: [expect.objectContaining({ serialNumber: "SN-1" })] });
    expect(result.current.data?.activity.facilityName).toBe("Facility A");
  });

  it("flattens a parent/child asset-search response before building sections", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 1, facility: [row()] });
    vi.mocked(searchAssetsForActivityFacility).mockResolvedValue([
      { assetId: "family-1", assetTypeID: "SOLAR", children: [panelAsset] },
    ]);
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs1", url: "https://img/fs1" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toMatchObject({ kind: "ASSET", items: [expect.objectContaining({ serialNumber: "SN-1" })] });
  });

  it("returns null without throwing when the facility row is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 0, facility: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(searchAssetsForActivityFacility).not.toHaveBeenCalled();
  });

  it("degrades to empty solar sections (without failing the query) when the asset search throws", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 1, facility: [row()] });
    vi.mocked(searchAssetsForActivityFacility).mockRejectedValue(new Error("asset search failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const sectionIds = result.current.data?.sections.map((section) => section.id) ?? [];
    expect(sectionIds).not.toContain("PANEL");
    expect(sectionIds).toContain("INSTALLATION_COMPLETION_REPORT");
    expect(sectionIds).toContain("INSTALLATION_IMAGE_SITE_OVERVIEW");
    expect(fetchFileUrls).not.toHaveBeenCalled();
  });

  it("degrades to the empty MachineAssetData default when the asset search throws for a machine activity", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({
      totalCount: 1,
      facility: [row({ componentType: "MACHINE" })],
    });
    vi.mocked(searchAssetsForActivityFacility).mockRejectedValue(new Error("asset search failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const machineSection = result.current.data?.sections.find((section) => section.id === "MACHINE");
    expect(machineSection).toMatchObject({ details: undefined, items: [], mediaGroups: [] });
  });

  it("still resolves the query when the asset-media-URL fetch throws, leaving asset photos unresolved", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 1, facility: [row()] });
    vi.mocked(searchAssetsForActivityFacility).mockResolvedValue([panelAsset]);
    vi.mocked(fetchFileUrls).mockRejectedValue(new Error("filestore failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toMatchObject({ items: [expect.objectContaining({ images: [] })] });
  });

  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1", user: authedUser }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null, user: authedUser }],
    [
      "user lacks IR access",
      { accessToken: "token-1", employeeTenantId: "tenant-1", user: { roles: [{ code: "OTHER" }] } },
    ],
  ])("never calls searchActivityFacilities when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityReview("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchActivityFacilities).not.toHaveBeenCalled();
  });
});

describe("useLoadSectionMedia", () => {
  it("resolves REPORT section media by fetching file URLs for its documents", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs2", url: "https://report/fs2" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLoadSectionMedia("act-1", "Facility A"), { wrapper });
    const section: ReviewSectionContent = {
      kind: "REPORT",
      id: "INSTALLATION_COMPLETION_REPORT",
      labelKey: "ES_IR_SECTION_INSTALLATION_COMPLETION_REPORT",
      label: "Installation Completion Report",
      specifications: [],
      report: null,
      supportingDocuments: [],
    };
    const documents = [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs2" }];

    const media = await result.current(section, documents);

    expect(fetchFileUrls).toHaveBeenCalledWith(["fs2"], "tenant-1", "token-1", authedUser);
    expect(media).toEqual({
      report: { name: "Facility A.pdf", url: "https://report/fs2" },
      supportingDocuments: [],
    });
  });
});

describe("useSubmitActivityReview", () => {
  it("submits the review through submitFacilityReview", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(submitFacilityReview).mockResolvedValue({ ok: true });
    const { wrapper } = createWrapper();
    const input = { activityId: "act-1", action: "APPROVE" as const, documents: [] };

    const { result } = renderHook(() => useSubmitActivityReview("act-1"), { wrapper });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(submitFacilityReview).toHaveBeenCalledWith(input, "tenant-1", "token-1", authedUser);
  });

  it("invalidates the ir-activity-review query for this activity on success", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(submitFacilityReview).mockResolvedValue({ ok: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const input = { activityId: "act-1", action: "APPROVE" as const, documents: [] };

    const { result } = renderHook(() => useSubmitActivityReview("act-1"), { wrapper });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ir-activity-review", "tenant-1", "act-1"] });
  });
});
