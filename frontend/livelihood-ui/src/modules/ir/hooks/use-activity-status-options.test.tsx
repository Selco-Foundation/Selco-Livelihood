import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useActivityStatusOptions } from "./use-activity-status-options";
import { FACILITY_INSTALLATION_BUSINESS_SERVICE } from "../constants/activity-status";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    fetchWorkflowBusinessService: vi.fn(),
    tenantId: vi.fn(() => "fallback-tenant"),
    useTranslate: () => ({ t: (key: string) => key }),
  };
});

import { fetchWorkflowBusinessService, tenantId } from "@/shared";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return wrapper;
}

const authedUser = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

beforeEach(() => {
  vi.mocked(fetchWorkflowBusinessService).mockReset();
  vi.mocked(tenantId).mockReset().mockReturnValue("fallback-tenant");
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useActivityStatusOptions", () => {
  it("fetches the business service and orders options by ACTIVITY_STATUS_ORDER, dropping unknown statuses", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchWorkflowBusinessService).mockResolvedValue({
      BusinessServices: [
        {
          states: [
            { applicationStatus: "APPROVED_BY_QC_SPOC" },
            { applicationStatus: "SCHEDULED" },
            { applicationStatus: "SOME_UNKNOWN_STATUS" },
            { applicationStatus: "SUBMITTED_BY_FIELD_STAFF" },
          ],
        },
      ],
    });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useActivityStatusOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchWorkflowBusinessService).toHaveBeenCalledWith(
      "tenant-1",
      FACILITY_INSTALLATION_BUSINESS_SERVICE,
      "token-1",
      authedUser,
    );
    expect(result.current.options).toEqual([
      { code: "SCHEDULED", name: "Scheduled" },
      { code: "SUBMITTED_BY_FIELD_STAFF", name: "Pending Review" },
      { code: "APPROVED_BY_QC_SPOC", name: "Approved" },
    ]);
  });

  it("returns an empty options array when no states are returned", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: "tenant-1", user: authedUser });
    vi.mocked(fetchWorkflowBusinessService).mockResolvedValue({ BusinessServices: [] });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useActivityStatusOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
  });

  it("falls back to the shared tenantId() when employeeTenantId is missing", async () => {
    useAuthStore.setState({ accessToken: "token-1", employeeTenantId: null, user: authedUser });
    vi.mocked(fetchWorkflowBusinessService).mockResolvedValue({ BusinessServices: [] });
    const wrapper = createWrapper();

    renderHook(() => useActivityStatusOptions(), { wrapper });

    await waitFor(() =>
      expect(fetchWorkflowBusinessService).toHaveBeenCalledWith(
        "fallback-tenant",
        FACILITY_INSTALLATION_BUSINESS_SERVICE,
        "token-1",
        authedUser,
      ),
    );
  });

  it("never calls fetchWorkflowBusinessService when there is no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, employeeTenantId: "tenant-1", user: authedUser });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useActivityStatusOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(fetchWorkflowBusinessService).not.toHaveBeenCalled();
  });
});
