import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tenantId, useAuthStore } from "@/shared";
import type { ReviewSectionContent } from "@/ui";
import { useActivityDetails, useLoadSectionMedia } from "./use-activity-details";
import type { ActivityFacilityRow } from "../services/activity-detail";
import type { AssetSearchResponseItem } from "../services/asset";

vi.mock("../services/activity-detail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/activity-detail")>();
  return { ...actual, fetchActivityFacilityById: vi.fn() };
});
vi.mock("../services/asset", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/asset")>();
  return { ...actual, searchAssetsForActivity: vi.fn() };
});
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    fetchFileUrls: vi.fn(),
    fetchInstallationImageCriteriaQuery: vi.fn(),
    fetchRejectionReasonOptionsQuery: vi.fn(),
  };
});

import { fetchFileUrls, fetchInstallationImageCriteriaQuery, fetchRejectionReasonOptionsQuery } from "@/shared";
import { fetchActivityFacilityById } from "../services/activity-detail";
import { searchAssetsForActivity } from "../services/asset";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

function row(overrides: Partial<NonNullable<ActivityFacilityRow["activityFacility"]>> = {}): ActivityFacilityRow {
  return {
    activityFacility: {
      id: "act-1",
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

const authedUser = { uuid: "user-1", roles: [{ code: "END_USER_ADMIN" }] };

function mockMdmsMasters() {
  vi.mocked(fetchInstallationImageCriteriaQuery).mockReturnValue(async () => [
    { code: "SITE_OVERVIEW", description: "Site overview photo" },
  ]);
  vi.mocked(fetchRejectionReasonOptionsQuery).mockReturnValue(async () => []);
}

beforeEach(() => {
  vi.mocked(fetchActivityFacilityById).mockReset();
  vi.mocked(searchAssetsForActivity).mockReset();
  vi.mocked(fetchFileUrls).mockReset();
  vi.mocked(fetchInstallationImageCriteriaQuery).mockReset();
  vi.mocked(fetchRejectionReasonOptionsQuery).mockReset();
  mockMdmsMasters();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
  vi.restoreAllMocks();
});

describe("useActivityDetails", () => {
  it("builds an activity detail from the facility row, resolving asset media URLs", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(row());
    vi.mocked(searchAssetsForActivity).mockResolvedValue([panelAsset]);
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs1", url: "https://img/fs1" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchActivityFacilityById).toHaveBeenCalledWith("act-1", tenantId(), "token-1", authedUser);
    expect(searchAssetsForActivity).toHaveBeenCalledWith("act-1", tenantId(), "token-1", authedUser);
    expect(fetchFileUrls).toHaveBeenCalledWith(["fs1"], tenantId(), "token-1", authedUser);

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toBeDefined();
    expect(panelSection).toMatchObject({ kind: "ASSET", items: [expect.objectContaining({ serialNumber: "SN-1" })] });
    expect(result.current.data?.info.district).toEqual({ code: "D1" });
  });

  it("flattens a parent/child asset-search response before building sections", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(row());
    vi.mocked(searchAssetsForActivity).mockResolvedValue([
      { assetId: "family-1", assetTypeID: "SOLAR", children: [panelAsset] },
    ]);
    vi.mocked(fetchFileUrls).mockResolvedValue({ fileStoreIds: [{ id: "fs1", url: "https://img/fs1" }] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toMatchObject({ kind: "ASSET", items: [expect.objectContaining({ serialNumber: "SN-1" })] });
  });

  it("returns null without throwing when the facility row is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(undefined);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(searchAssetsForActivity).not.toHaveBeenCalled();
  });

  it("degrades to empty solar sections (without failing the query) when the asset search throws", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(row());
    vi.mocked(searchAssetsForActivity).mockRejectedValue(new Error("asset search failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const sectionIds = result.current.data?.sections.map((section) => section.id) ?? [];
    expect(sectionIds).not.toContain("PANEL");
    expect(sectionIds).toContain("INSTALLATION_COMPLETION_REPORT");
    expect(sectionIds).toContain("INSTALLATION_IMAGE_SITE_OVERVIEW");
    expect(fetchFileUrls).not.toHaveBeenCalled();
  });

  it("degrades to the empty MachineAssetData default when the asset search throws for a machine activity", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(row({ componentType: "MACHINE" }));
    vi.mocked(searchAssetsForActivity).mockRejectedValue(new Error("asset search failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const machineSection = result.current.data?.sections.find((section) => section.id === "MACHINE");
    expect(machineSection).toMatchObject({ details: undefined, items: [], mediaGroups: [] });
  });

  it("still resolves the query when the asset-media-URL fetch throws, leaving asset photos unresolved", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchActivityFacilityById).mockResolvedValue(row());
    vi.mocked(searchAssetsForActivity).mockResolvedValue([panelAsset]);
    vi.mocked(fetchFileUrls).mockRejectedValue(new Error("filestore failed"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const panelSection = result.current.data?.sections.find((section) => section.id === "PANEL");
    expect(panelSection).toMatchObject({ items: [expect.objectContaining({ images: [] })] });
  });

  it("never calls fetchActivityFacilityById when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, user: authedUser });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivityDetails("act-1"), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchActivityFacilityById).not.toHaveBeenCalled();
  });
});

describe("useLoadSectionMedia", () => {
  it("resolves REPORT section media by fetching file URLs for its documents", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
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

    expect(fetchFileUrls).toHaveBeenCalledWith(["fs2"], tenantId(), "token-1", authedUser);
    expect(media).toEqual({
      report: { name: "Facility A.pdf", url: "https://report/fs2" },
      supportingDocuments: [],
    });
  });
});
