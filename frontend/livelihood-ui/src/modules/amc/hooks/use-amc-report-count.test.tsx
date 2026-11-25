import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchAmcVisits } from "../services/amc-visits";
import { useAmcReportCount } from "./use-amc-report-count";

vi.mock("@/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared")>()),
  tenantId: () => "livelihood",
}));
vi.mock("../services/amc-visits", () => ({ searchAmcVisits: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.mocked(searchAmcVisits).mockReset();
  useAuthStore.setState({ accessToken: "t", user: { roles: [{ code: "AMC_REVIEWER" }] } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcReportCount", () => {
  it("counts every submitted report with one count query", async () => {
    vi.mocked(searchAmcVisits).mockResolvedValue({ ScheduledVisits: [], TotalCount: 13 });

    const { result } = renderHook(() => useAmcReportCount(), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(13));
    expect(searchAmcVisits).toHaveBeenCalledWith(
      { tenantId: "livelihood", statuses: ["PENDING_APPROVAL", "REJECTED", "APPROVED"], isCountQuery: true },
      { limit: 1, offset: 0 },
      "t",
      expect.anything(),
    );
  });

  it("does not search without reviewer access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

    renderHook(() => useAmcReportCount(), { wrapper });

    expect(searchAmcVisits).not.toHaveBeenCalled();
  });
});
