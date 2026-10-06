import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationPlans } from "./use-installation-plans";
import type { ActivityAssignment, ActivityAssignmentSearchResponse } from "../types/installation-plan";

vi.mock("../services/installation-plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-plan")>();
  return { ...actual, searchActivityAssignments: vi.fn() };
});

import { QC_APPROVER_ROLE, searchActivityAssignments } from "../services/installation-plan";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function assignment(overrides: Partial<ActivityAssignment> = {}): ActivityAssignment {
  return {
    id: "assign-1",
    tenantId: "tenant-1",
    fieldPlanId: "plan-1",
    fieldPlan: { id: "plan-1", name: "Plan One" },
    startDate: 1700000000000,
    endDate: 1700100000000,
    ...overrides,
  };
}

const authedUser = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

beforeEach(() => {
  vi.mocked(searchActivityAssignments).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useInstallationPlans", () => {
  it("builds criteria with the QC approver role and maps the response when enabled", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityAssignments).mockResolvedValue({
      ActivityAssignment: [assignment()],
      TotalCount: 1,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useInstallationPlans({ pageOffset: 10, pageSize: 20 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityAssignments).toHaveBeenCalledWith(
      { tenantId: "tenant-1", roles: [QC_APPROVER_ROLE] },
      { limit: 20, offset: 10 },
      "token-1",
      authedUser,
    );
    expect(result.current.data?.totalCount).toBe(1);
    expect(result.current.data?.plans).toEqual([
      expect.objectContaining({ planId: "plan-1", planName: "Plan One", tenantId: "tenant-1" }),
    ]);
  });

  it("includes fieldPlanCode and fieldPlanIds only when provided", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityAssignments).mockResolvedValue({ ActivityAssignment: [], TotalCount: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(
      () => useInstallationPlans({ searchText: "code-1", fieldPlanIds: ["plan-1", "plan-2"] }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityAssignments).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        roles: [QC_APPROVER_ROLE],
        fieldPlanCode: "code-1",
        fieldPlanIds: ["plan-1", "plan-2"],
      },
      { limit: 10, offset: 0 },
      "token-1",
      authedUser,
    );
  });

  it("omits fieldPlanCode/fieldPlanIds when searchText is empty and fieldPlanIds is []", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityAssignments).mockResolvedValue({ ActivityAssignment: [], TotalCount: 0 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useInstallationPlans({ searchText: "", fieldPlanIds: [] }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchActivityAssignments).toHaveBeenCalledWith(
      { tenantId: "tenant-1", roles: [QC_APPROVER_ROLE] },
      { limit: 10, offset: 0 },
      "token-1",
      authedUser,
    );
  });

  it("defaults plans to [] and totalCount to 0 when the response omits them", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(searchActivityAssignments).mockResolvedValue({} as ActivityAssignmentSearchResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useInstallationPlans(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ plans: [], totalCount: 0 });
  });

  it.each([
    ["missing accessToken", { accessToken: null, employeeTenantId: "tenant-1", user: authedUser }],
    ["missing employeeTenantId", { accessToken: "token-1", employeeTenantId: null, user: authedUser }],
    [
      "user lacks IR access",
      { accessToken: "token-1", employeeTenantId: "tenant-1", user: { roles: [{ code: "OTHER" }] } },
    ],
  ])("never calls searchActivityAssignments when %s", async (_label, state) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useInstallationPlans(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(searchActivityAssignments).not.toHaveBeenCalled();
  });
});
