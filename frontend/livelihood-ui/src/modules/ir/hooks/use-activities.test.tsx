import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useActivities, useBulkApproveActivities } from "./use-activities";
import type { ActivityFacilityRow } from "../types/activity-review";

vi.mock("../services/facility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/facility")>();
  return {
    ...actual,
    searchActivityFacilities: vi.fn(),
    bulkUpdateActivityFacilitiesWorkflow: vi.fn(),
  };
});

import { bulkUpdateActivityFacilitiesWorkflow, searchActivityFacilities } from "../services/facility";

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

const authedUser = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

beforeEach(() => {
  vi.mocked(searchActivityFacilities).mockReset();
  vi.mocked(bulkUpdateActivityFacilitiesWorkflow).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useActivities", () => {
  it("builds the search criteria and maps the response when enabled", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 1, facility: [row()] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useActivities("plan-1", { pageOffset: 20, pageSize: 5 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityFacilities).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        fieldPlanIds: ["plan-1"],
        activityCodes: ["INS"],
      },
      { limit: 5, offset: 20 },
      "token-1",
      authedUser,
    );
    expect(result.current.data).toEqual({
      totalCount: 1,
      activities: [
        {
          activityId: "act-1",
          facilityId: "fac-1",
          facilityName: "Facility A",
          componentType: "SOLAR",
          planId: "plan-1",
          status: "SUBMITTED_BY_FIELD_STAFF",
          district: { code: "D1" },
          block: { code: "B1" },
        },
      ],
    });
  });

  it("only includes boundaryCodes/statuses/componentTypes/searchText when non-empty", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 0, facility: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useActivities("plan-1", {
          boundaryCodes: [],
          statuses: [],
          componentTypes: [],
          searchText: "",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityFacilities).toHaveBeenCalledWith(
      { tenantId: "tenant-1", fieldPlanIds: ["plan-1"], activityCodes: ["INS"] },
      { limit: 10, offset: 0 },
      "token-1",
      authedUser,
    );
  });

  it("includes boundaryCodes/statuses/componentTypes/searchText when provided", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({ totalCount: 0, facility: [] });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useActivities("plan-1", {
          boundaryCodes: ["FAC_1"],
          statuses: ["SCHEDULED"],
          componentTypes: ["SOLAR"],
          searchText: "site",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityFacilities).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        fieldPlanIds: ["plan-1"],
        activityCodes: ["INS"],
        boundaryCodes: ["FAC_1"],
        statuses: ["SCHEDULED"],
        componentTypes: ["SOLAR"],
        facilityName: "site",
      },
      { limit: 10, offset: 0 },
      "token-1",
      authedUser,
    );
  });

  it("defaults totalCount to 0 and activities to [] when the response omits them", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityFacilities).mockResolvedValue({});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useActivities("plan-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ totalCount: 0, activities: [] });
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

    const { result } = renderHook(() => useActivities("plan-1"), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchActivityFacilities).not.toHaveBeenCalled();
  });

  it("does not call searchActivityFacilities when planId is empty", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    const { wrapper } = createWrapper();

    renderHook(() => useActivities(""), { wrapper });

    await waitFor(() => expect(searchActivityFacilities).not.toHaveBeenCalled());
  });
});

describe("useBulkApproveActivities", () => {
  it("always sends isAllSelected: false with the given activityFacilityIds", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(bulkUpdateActivityFacilitiesWorkflow).mockResolvedValue({
      status: 200,
      data: { succeededProjectIDs: ["f1", "f2"], failedProjectIDs: [] },
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useBulkApproveActivities("plan-1"), { wrapper });
    result.current.mutate({ activityIds: ["f1", "f2"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(bulkUpdateActivityFacilitiesWorkflow).toHaveBeenCalledWith(
      {
        workflow: { action: "APPROVE", comments: "Approved by Installation Reviewer" },
        isAllSelected: false,
        activityFacilityIds: ["f1", "f2"],
      },
      "tenant-1",
      "token-1",
      authedUser,
    );
  });

  it("invalidates both ir-activities and ir-installation-plans queries on success", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(bulkUpdateActivityFacilitiesWorkflow).mockResolvedValue({
      status: 200,
      data: { succeededProjectIDs: ["f1"], failedProjectIDs: [] },
    });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useBulkApproveActivities("plan-1"), { wrapper });
    result.current.mutate({ activityIds: ["f1"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ir-activities", "tenant-1", "plan-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ir-installation-plans"] });
  });
});
