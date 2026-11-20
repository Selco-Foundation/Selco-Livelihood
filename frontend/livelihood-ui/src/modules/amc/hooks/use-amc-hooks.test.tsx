import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchAmcProjectSummaries, searchAmcVisits, updateAmcVisitWorkflow } from "../services/amc-visits";
import type { RawAmcVisit } from "../types/amc-visit";
import { useAmcProject, useAmcProjects } from "./use-amc-projects";
import { useAmcReport } from "./use-amc-report";
import { useAmcReports } from "./use-amc-reports";
import { useApproveAmcReport, useSendAmcReportForRework } from "./use-amc-review-actions";

vi.mock("@/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared")>()),
  tenantId: () => "livelihood",
}));
vi.mock("../services/amc-visits", () => ({
  searchAmcVisits: vi.fn(),
  searchAmcProjectSummaries: vi.fn(),
  updateAmcVisitWorkflow: vi.fn(),
  searchVendorOrganisations: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const reviewer = { uuid: "u1", roles: [{ code: "AMC_REVIEWER" }] };
const visit: RawAmcVisit = { id: "v1", status: "PENDING_APPROVAL", facility: { facility_name: "name1" }, visitNumber: 1 };

beforeEach(() => {
  vi.mocked(searchAmcVisits).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: reviewer });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcReports", () => {
  it("searches one page on the server and maps the visits", async () => {
    vi.mocked(searchAmcVisits).mockResolvedValue({ ScheduledVisits: [visit], TotalCount: 11 });

    const { result } = renderHook(() => useAmcReports({ tab: "pending", states: ["KA"], offset: 10, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAmcVisits).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "livelihood", statuses: ["PENDING_APPROVAL"], states: ["KA"] }),
      { limit: 10, offset: 10 },
      "token-1",
      reviewer,
    );
    expect(result.current.data).toMatchObject({ totalCount: 11, reports: [{ id: "v1", endUserName: "name1" }] });
  });

  it("does not search for a user without the AMC reviewer role", () => {
    useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u2", roles: [{ code: "PROJECT_MANAGER" }] } });

    renderHook(() => useAmcReports({ tab: "pending" }), { wrapper: createWrapper() });

    expect(searchAmcVisits).not.toHaveBeenCalled();
  });
});

describe("useAmcReport", () => {
  it("reads one visit with its site details, or null when not found", async () => {
    vi.mocked(searchAmcVisits).mockResolvedValueOnce({ ScheduledVisits: [visit], TotalCount: 1 });
    const found = renderHook(() => useAmcReport("v1"), { wrapper: createWrapper() });
    await waitFor(() => expect(found.result.current.data?.id).toBe("v1"));
    expect(searchAmcVisits).toHaveBeenCalledWith(
      { tenantId: "livelihood", ids: ["v1"], includeSiteDetails: true },
      { limit: 1, offset: 0 },
      "token-1",
      reviewer,
    );

    vi.mocked(searchAmcVisits).mockResolvedValueOnce({ ScheduledVisits: [], TotalCount: 0 });
    const missing = renderHook(() => useAmcReport("v9"), { wrapper: createWrapper() });
    await waitFor(() => expect(missing.result.current.isSuccess).toBe(true));
    expect(missing.result.current.data).toBeNull();
  });
});

describe("useAmcProjects / useAmcProject", () => {
  it("pages the project summaries and finds one project by id", async () => {
    vi.mocked(searchAmcProjectSummaries).mockResolvedValue({
      ProjectSummaries: [{ projectId: "p1", projectName: "P1", pendingCount: 2 }],
      TotalCount: 1,
    });

    const list = renderHook(() => useAmcProjects({ offset: 0, limit: 10 }), { wrapper: createWrapper() });
    await waitFor(() => expect(list.result.current.data?.projects[0]).toMatchObject({ projectId: "p1", pendingCount: 2 }));

    const one = renderHook(() => useAmcProject("p1"), { wrapper: createWrapper() });
    await waitFor(() => expect(one.result.current.data?.projectName).toBe("P1"));
    expect(searchAmcProjectSummaries).toHaveBeenCalledWith({ projectIds: ["p1"], offset: 0, limit: 1 }, "token-1", reviewer);
  });
});

describe("review action hooks", () => {
  it("approves a report", async () => {
    vi.mocked(updateAmcVisitWorkflow).mockResolvedValue({});
    const { result } = renderHook(() => useApproveAmcReport(), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync("v1"));

    expect(updateAmcVisitWorkflow).toHaveBeenCalledWith("v1", "APPROVE", null, "token-1", reviewer);
  });

  it("sends a report for rework with the reasons as a JSON comment", async () => {
    vi.mocked(updateAmcVisitWorkflow).mockResolvedValue({});
    const { result } = renderHook(() => useSendAmcReportForRework(), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync({ reportId: "v1", reasons: [{ reason: "OTHERS", comment: "Retake" }] }));

    expect(updateAmcVisitWorkflow).toHaveBeenCalledWith(
      "v1",
      "REJECT",
      '[{"reason":"OTHERS","comment":"Retake"}]',
      "token-1",
      reviewer,
    );
  });
});
