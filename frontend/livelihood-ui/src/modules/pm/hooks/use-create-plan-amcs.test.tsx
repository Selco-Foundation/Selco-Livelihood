import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useCreatePlanAmcs } from "./use-create-plan-amcs";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { createAmcConfigurations } from "../services/amc-configuration";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood" };
});
vi.mock("./use-amc-options", () => ({ useAmcOptions: () => ({ defaultFrequencyMonths: 6, defaultYears: 1 }) }));
vi.mock("../services/activity-facility", () => ({ searchPlanActivityFacilities: vi.fn() }));
vi.mock("../services/amc-configuration", () => ({ createAmcConfigurations: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});
afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
  vi.resetAllMocks();
});

describe("useCreatePlanAmcs", () => {
  it("looks up the plan's solar rows, then creates one AMC per chosen site", async () => {
    vi.mocked(searchPlanActivityFacilities).mockResolvedValue({
      facility: [{ activityFacility: { id: "af1", facilityId: "site-1", status: "ASSIGNED_TO_FIELD_STAFF" } }],
    });
    vi.mocked(createAmcConfigurations).mockResolvedValue({ AmcConfigurations: [] });
    const { result } = renderHook(() => useCreatePlanAmcs("plan-1"), { wrapper });

    await act(() => result.current.mutateAsync([{ facilityId: "site-1", vendorOrgId: "org-1", fieldStaffId: "s1" }]));

    expect(searchPlanActivityFacilities).toHaveBeenCalledWith(
      { fieldPlanIds: ["plan-1"], componentTypes: ["SOLAR"] },
      { limit: 500 },
      "token-1",
      { uuid: "u1" },
    );
    expect(createAmcConfigurations).toHaveBeenCalledWith(
      [
        {
          tenantId: "livelihood",
          activityFacilityId: "af1",
          visitFrequencyMonths: 6,
          durationMonths: 12,
          vendorOrgId: "org-1",
          amcFieldStaffId: "s1",
        },
      ],
      "token-1",
      { uuid: "u1" },
    );
  });

  it("makes no call when no site is chosen", async () => {
    const { result } = renderHook(() => useCreatePlanAmcs("plan-1"), { wrapper });

    await act(() => result.current.mutateAsync([]));

    expect(searchPlanActivityFacilities).not.toHaveBeenCalled();
    expect(createAmcConfigurations).not.toHaveBeenCalled();
  });
});
