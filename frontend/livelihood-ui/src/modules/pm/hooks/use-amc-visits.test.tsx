import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchAmcVisits } from "../services/amc-visit";
import { useAmcVisits } from "./use-amc-visits";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, tenantId: () => "livelihood" };
});
vi.mock("../services/amc-visit", () => ({ searchAmcVisits: vi.fn() }));

beforeEach(() => useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } }));
afterEach(() => useAuthStore.setState({ accessToken: null, user: null }));

it("fetches afresh when the list is reopened, even with a long default stale time", async () => {
  vi.mocked(searchAmcVisits)
    .mockResolvedValueOnce({ ScheduledVisits: [{ id: "v1", fieldStaff: { name: "Old" } }] })
    .mockResolvedValue({ ScheduledVisits: [{ id: "v1", fieldStaff: { name: "New" } }] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, rerender } = renderHook(({ id }: { id?: string }) => useAmcVisits(id), {
    wrapper,
    initialProps: { id: "amc-1" } as { id?: string },
  });
  await waitFor(() => expect(result.current.data?.[0].fieldStaffName).toBe("Old"));

  rerender({ id: undefined });
  expect(result.current.data).toBeUndefined();
  rerender({ id: "amc-1" });

  await waitFor(() => expect(result.current.data?.[0].fieldStaffName).toBe("New"));
  expect(searchAmcVisits).toHaveBeenCalledTimes(2);
});
