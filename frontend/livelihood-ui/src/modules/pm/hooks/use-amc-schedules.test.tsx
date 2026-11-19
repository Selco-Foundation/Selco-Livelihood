import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchPlanActivityFacilities } from "../services/activity-facility";
import { searchAmcConfigurations, updateAmcConfigurations, updateAmcFieldStaff } from "../services/amc-configuration";
import type { AmcScheduleRow } from "../types/amc";
import { useAmcSchedules } from "./use-amc-schedules";
import { useUpdateAmcSchedules } from "./use-update-amc-schedules";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood" };
});
vi.mock("../services/activity-facility", () => ({ searchPlanActivityFacilities: vi.fn() }));
vi.mock("../services/amc-configuration", () => ({
  searchAmcConfigurations: vi.fn(),
  updateAmcConfigurations: vi.fn(),
  updateAmcFieldStaff: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const row: AmcScheduleRow = {
  id: "amc-1",
  activityFacilityId: "row-1",
  status: "ACTIVE",
  endUserName: "user979",
  phoneNumber: "9876543210",
  state: "Assam",
  district: "Kamrup",
  block: "Rangia",
  installedOn: 900,
  startDate: 1000,
  frequencyMonths: 6,
  years: 2,
};

beforeEach(() => {
  vi.mocked(searchPlanActivityFacilities).mockReset();
  vi.mocked(searchAmcConfigurations).mockReset();
  vi.mocked(updateAmcConfigurations).mockReset();
  vi.mocked(updateAmcFieldStaff).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcSchedules", () => {
  it("finds the plan's SOLAR rows, then searches the running AMCs on them", async () => {
    vi.mocked(searchPlanActivityFacilities).mockResolvedValue({
      facility: [{ activityFacility: { id: "row-1" } }, { activityFacility: { id: "row-2" } }],
    });
    vi.mocked(searchAmcConfigurations).mockResolvedValue({ AmcConfigurations: [{ id: "amc-1" } as never], TotalCount: 1 });

    const { result } = renderHook(() => useAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchPlanActivityFacilities).toHaveBeenCalledWith(
      { fieldPlanIds: ["plan-1"], componentTypes: ["SOLAR"] },
      { limit: 500 },
      "token-1",
      { uuid: "u1" },
    );
    expect(searchAmcConfigurations).toHaveBeenCalledWith(
      { activityFacilityIds: ["row-1", "row-2"], statuses: ["PENDING_ACTIVATION", "ACTIVE"] },
      { limit: 500 },
      "token-1",
      { uuid: "u1" },
    );
    expect(result.current.data).toEqual({ AmcConfigurations: [{ id: "amc-1" }], TotalCount: 1 });
  });

  it("skips the AMC search when the plan has no SOLAR rows", async () => {
    vi.mocked(searchPlanActivityFacilities).mockResolvedValue({ facility: [] });

    const { result } = renderHook(() => useAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAmcConfigurations).not.toHaveBeenCalled();
    expect(result.current.data).toEqual({ AmcConfigurations: [], TotalCount: 0 });
  });

  it("does not search without a plan id", () => {
    renderHook(() => useAmcSchedules(undefined), { wrapper: createWrapper() });

    expect(searchPlanActivityFacilities).not.toHaveBeenCalled();
  });
});

describe("useUpdateAmcSchedules", () => {
  it("sends only the changed rows as the minimal update body", async () => {
    vi.mocked(updateAmcConfigurations).mockResolvedValue({ AmcConfigurations: [] });
    const { result } = renderHook(() => useUpdateAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync({ original: [row], rows: [{ ...row, frequencyMonths: 12, years: 3 }] }));

    expect(updateAmcConfigurations).toHaveBeenCalledWith(
      [{ tenantId: "livelihood", id: "amc-1", visitFrequencyMonths: 12, durationMonths: 36 }],
      "token-1",
      { uuid: "u1" },
    );
  });

  it("makes no call when nothing changed", async () => {
    const { result } = renderHook(() => useUpdateAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await act(() => result.current.mutateAsync({ original: [row], rows: [{ ...row }] }));

    expect(updateAmcConfigurations).not.toHaveBeenCalled();
  });

  it("sends a field staff change on its own call, after the schedule", async () => {
    vi.mocked(updateAmcConfigurations).mockResolvedValue({ AmcConfigurations: [] });
    vi.mocked(updateAmcFieldStaff).mockResolvedValue({ AmcFieldStaffUpdates: [] });
    const { result } = renderHook(() => useUpdateAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await act(() =>
      result.current.mutateAsync({
        original: [{ ...row, fieldStaffId: "s1" }],
        rows: [{ ...row, frequencyMonths: 12, fieldStaffId: "s2" }],
      }),
    );

    expect(updateAmcConfigurations).toHaveBeenCalledTimes(1);
    expect(updateAmcFieldStaff).toHaveBeenCalledWith(
      [{ tenantId: "livelihood", activityFacilityId: row.activityFacilityId, fieldStaffUserId: "s2" }],
      "token-1",
      { uuid: "u1" },
    );
  });
});
