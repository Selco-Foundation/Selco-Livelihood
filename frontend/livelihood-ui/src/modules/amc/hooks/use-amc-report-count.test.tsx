import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchAmcReports } from "../services/amc-reports";
import { useAmcReportCount } from "./use-amc-report-count";

vi.mock("../services/amc-reports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/amc-reports")>()),
  searchAmcReports: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(searchAmcReports).mockClear();
  useAuthStore.setState({ accessToken: "t", user: { roles: [{ code: "AMC_REVIEWER" }] } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcReportCount", () => {
  it("adds the reviewer and auto-approved totals", async () => {
    vi.mocked(searchAmcReports).mockImplementation(async (criteria) => ({
      AmcReports: [],
      totalCount: criteria.tab === "auto" ? 4 : 11,
    }));

    const { result } = renderHook(() => useAmcReportCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(15));
  });

  it("does not search without reviewer access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

    renderHook(() => useAmcReportCount(), { wrapper });

    expect(searchAmcReports).not.toHaveBeenCalled();
  });
});
