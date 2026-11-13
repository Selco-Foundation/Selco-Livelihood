import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import {
  approveAmcReport,
  getAmcReport,
  searchAmcProjects,
  searchAmcReports,
  sendAmcReportForRework,
} from "../services/amc-reports";
import type { AmcReport } from "../types/amc-report";
import { useAmcProjects } from "./use-amc-projects";
import { useAmcReport } from "./use-amc-report";
import { useAmcReportFilterSource, useAmcReports } from "./use-amc-reports";
import { useApproveAmcReport, useSendAmcReportForRework } from "./use-amc-review-actions";

vi.mock("../services/amc-reports", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/amc-reports")>();
  return {
    ...actual,
    searchAmcReports: vi.fn(),
    getAmcReport: vi.fn(),
    searchAmcProjects: vi.fn(),
    approveAmcReport: vi.fn(),
    sendAmcReportForRework: vi.fn(),
  };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const reviewer = { uuid: "u1", roles: [{ code: "AMC_REVIEWER" }] };
const report = { id: "r1", endUserName: "user979" } as AmcReport;

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token-1", user: reviewer });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcReports", () => {
  it("searches with the given criteria", async () => {
    vi.mocked(searchAmcReports).mockResolvedValue({ AmcReports: [report], totalCount: 1 });

    const { result } = renderHook(() => useAmcReports({ tab: "pending", states: ["Assam"] }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAmcReports).toHaveBeenCalledWith({ tab: "pending", states: ["Assam"] }, "token-1", reviewer);
    expect(result.current.data?.totalCount).toBe(1);
  });

  it("does not search for a user without the AMC reviewer role", () => {
    useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u2", roles: [{ code: "PROJECT_MANAGER" }] } });
    vi.mocked(searchAmcReports).mockClear();

    renderHook(() => useAmcReports({ tab: "pending" }), { wrapper: createWrapper() });

    expect(searchAmcReports).not.toHaveBeenCalled();
  });
});

describe("useAmcReportFilterSource", () => {
  it("returns every report on the tab, unfiltered", async () => {
    vi.mocked(searchAmcReports).mockResolvedValue({ AmcReports: [report], totalCount: 1 });

    const { result } = renderHook(() => useAmcReportFilterSource("auto", "p1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAmcReports).toHaveBeenCalledWith({ tab: "auto", projectId: "p1" }, "token-1", reviewer);
    expect(result.current.data).toEqual([report]);
  });
});

describe("useAmcReport", () => {
  it("returns the single report, or null when not found", async () => {
    vi.mocked(getAmcReport).mockResolvedValueOnce({ AmcReports: [report], totalCount: 1 });
    const found = renderHook(() => useAmcReport("r1"), { wrapper: createWrapper() });
    await waitFor(() => expect(found.result.current.data).toEqual(report));

    vi.mocked(getAmcReport).mockResolvedValueOnce({ AmcReports: [], totalCount: 0 });
    const missing = renderHook(() => useAmcReport("r9"), { wrapper: createWrapper() });
    await waitFor(() => expect(missing.result.current.isSuccess).toBe(true));
    expect(missing.result.current.data).toBeNull();
  });
});

describe("useAmcProjects", () => {
  it("returns the project summaries", async () => {
    vi.mocked(searchAmcProjects).mockResolvedValue({
      AmcProjects: [
        { projectId: "p1", projectName: "P1", states: [], districts: [], blocks: [], pendingCount: 1, breachedCount: 0, autoApprovedCount: 2 },
      ],
    });

    const { result } = renderHook(() => useAmcProjects(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.[0].projectId).toBe("p1"));
  });
});

describe("review action hooks", () => {
  it("approves a report", async () => {
    vi.mocked(approveAmcReport).mockResolvedValue({ AmcReports: [], totalCount: 0 });
    const { result } = renderHook(() => useApproveAmcReport(), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync("r1"));

    expect(approveAmcReport).toHaveBeenCalledWith("r1", "token-1", reviewer);
  });

  it("sends a report for rework with the reason", async () => {
    vi.mocked(sendAmcReportForRework).mockResolvedValue({ AmcReports: [], totalCount: 0 });
    const { result } = renderHook(() => useSendAmcReportForRework(), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync({ reportId: "r1", reason: "Fix photo" }));

    expect(sendAmcReportForRework).toHaveBeenCalledWith("r1", "Fix photo", "token-1", reviewer);
  });
});
