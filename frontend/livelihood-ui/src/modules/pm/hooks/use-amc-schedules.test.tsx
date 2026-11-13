import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchAmcSchedules, updateAmcSchedules } from "../services/amc-schedule";
import type { RawAmcSchedule } from "../types/amc";
import { useAmcSchedules } from "./use-amc-schedules";
import { useUpdateAmcSchedules } from "./use-update-amc-schedules";

vi.mock("../services/amc-schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/amc-schedule")>();
  return { ...actual, searchAmcSchedules: vi.fn(), updateAmcSchedules: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const raw: RawAmcSchedule = {
  id: "amc-1",
  fieldPlanId: "plan-1",
  facilityId: "site-1",
  endUser: { name: "user979", mobileNumber: "9876543210" },
  boundary: { state: "Assam", district: "Kamrup", block: "Rangia" },
  componentType: "SOLAR",
  installationReportFirstSubmissionDate: 1000,
  configurationStartDate: 1000,
  visitFrequencyMonths: 6,
  durationMonths: 12,
};

beforeEach(() => {
  vi.mocked(searchAmcSchedules).mockReset();
  vi.mocked(updateAmcSchedules).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useAmcSchedules", () => {
  it("searches the plan's schedules and returns the raw response", async () => {
    vi.mocked(searchAmcSchedules).mockResolvedValue({ AmcSchedules: [raw] });

    const { result } = renderHook(() => useAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAmcSchedules).toHaveBeenCalledWith("plan-1", "token-1", { uuid: "u1" });
    expect(result.current.data).toEqual({ AmcSchedules: [raw] });
  });

  it("does not search without a plan id", () => {
    renderHook(() => useAmcSchedules(undefined), { wrapper: createWrapper() });

    expect(searchAmcSchedules).not.toHaveBeenCalled();
  });
});

describe("useUpdateAmcSchedules", () => {
  it("sends the edited rows merged onto the raw schedules", async () => {
    vi.mocked(updateAmcSchedules).mockResolvedValue({ AmcSchedules: [] });
    const { result } = renderHook(() => useUpdateAmcSchedules("plan-1"), { wrapper: createWrapper() });

    await act(() =>
      result.current.mutateAsync({
        original: [raw],
        rows: [
          {
            id: "amc-1",
            facilityId: "site-1",
            endUserName: "user979",
            phoneNumber: "9876543210",
            state: "Assam",
            district: "Kamrup",
            block: "Rangia",
            startDate: 1000,
            frequencyMonths: 12,
            years: 2,
          },
        ],
      }),
    );

    expect(updateAmcSchedules).toHaveBeenCalledWith(
      "plan-1",
      [{ ...raw, visitFrequencyMonths: 12, durationMonths: 24 }],
      "token-1",
      { uuid: "u1" },
    );
  });
});
