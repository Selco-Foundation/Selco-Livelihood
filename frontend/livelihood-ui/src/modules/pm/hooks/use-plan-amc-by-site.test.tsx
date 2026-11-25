import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { usePlanAmcBySite } from "./use-plan-amc-by-site";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { searchAmcConfigurations } from "../services/amc-configuration";

vi.mock("../services/activity-facility", () => ({ searchPlanActivityFacilities: vi.fn() }));
vi.mock("../services/amc-configuration", () => ({ searchAmcConfigurations: vi.fn() }));

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

describe("usePlanAmcBySite", () => {
  it("keys each running AMC by its site", async () => {
    vi.mocked(searchPlanActivityFacilities).mockResolvedValue({
      facility: [{ activityFacility: { id: "af1", facilityId: "site-1", componentType: "SOLAR" } }],
    });
    vi.mocked(searchAmcConfigurations).mockResolvedValue({
      AmcConfigurations: [{ id: "amc-1", status: "ACTIVE", activityFacilityId: "af1" }],
    });
    const { result } = renderHook(() => usePlanAmcBySite("plan-1"), { wrapper });

    await waitFor(() => expect(result.current.data?.["site-1"]?.id).toBe("amc-1"));
    expect(searchAmcConfigurations).toHaveBeenCalledWith(
      { activityFacilityIds: ["af1"], statuses: ["PENDING_ACTIVATION", "ACTIVE"] },
      { limit: 500 },
      "token-1",
      { uuid: "u1" },
    );
  });

  it("skips the AMC search when the plan has no solar rows", async () => {
    vi.mocked(searchPlanActivityFacilities).mockResolvedValue({ facility: [] });
    const { result } = renderHook(() => usePlanAmcBySite("plan-1"), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({}));
    expect(searchAmcConfigurations).not.toHaveBeenCalled();
  });
});
