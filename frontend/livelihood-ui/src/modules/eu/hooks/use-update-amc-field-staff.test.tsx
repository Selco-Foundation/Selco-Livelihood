import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { toast } from "@/ui";
import { updateAmcFieldStaff } from "../services/amc";
import { useUpdateAmcFieldStaff } from "./use-update-amc-field-staff";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood" };
});
vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});
vi.mock("../services/amc", () => ({ updateAmcFieldStaff: vi.fn() }));

const change = { activityFacilityId: "af-1", fieldStaffUserId: "fs-1", vendorOrgId: "org-1" };

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderHook(() => useUpdateAmcFieldStaff(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }).result;
}

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});
afterEach(() => useAuthStore.setState({ accessToken: null, user: null }));

describe("useUpdateAmcFieldStaff", () => {
  it("says what happened to the visits", async () => {
    vi.mocked(updateAmcFieldStaff).mockResolvedValue({
      AmcFieldStaffUpdates: [{ activityFacilityId: "af-1", outcome: "CHANGED", visitsMoved: 1, visitsReset: 1 }],
    });
    const result = setup();
    await act(() => result.current.mutateAsync(change));
    expect(toast.success).toHaveBeenCalledWith("AMC field staff changed", {
      description: "Visits moved to the new field staff: 1. Visits restarted, saved report discarded: 1",
    });
  });

  it("shows nothing when the server changed nothing", async () => {
    vi.mocked(updateAmcFieldStaff).mockResolvedValue({
      AmcFieldStaffUpdates: [{ activityFacilityId: "af-1", outcome: "UNCHANGED", visitsMoved: 0, visitsReset: 0 }],
    });
    const result = setup();
    await act(() => result.current.mutateAsync(change));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows a clear message instead of the server's row text", async () => {
    vi.mocked(updateAmcFieldStaff).mockRejectedValue({
      response: { data: { Errors: [{ code: "AMC_NOT_FOUND", message: "row 1 (af-1), activityFacilityId: no running AMC" }] } },
    });
    const result = setup();
    await act(() => result.current.mutateAsync(change).catch(() => undefined));
    expect(toast.error).toHaveBeenCalledWith("Could not change the AMC field staff", {
      description: "There is no running AMC; it may have been turned off",
    });
  });
});
