import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { searchHrmsEmployees } from "@/shared/api/hrms";
import { useReviewerOptions } from "./use-reviewer-options";

vi.mock("@/shared/api/hrms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/hrms")>();
  return { ...actual, searchHrmsEmployees: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(searchHrmsEmployees).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useReviewerOptions", () => {
  it("searches HRMS scoped to the QC-team role code (not the misleadingly named one)", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([]);

    renderHook(() => useReviewerOptions(), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(searchHrmsEmployees).toHaveBeenCalledWith(
        { roles: "INSTALLATION_REPORT_APPROVER_QC_TEAM", isActive: true },
        "token-1",
        { uuid: "u1" },
      ),
    );
  });

  it("maps employees with a uuid to reviewer options, preferring the employee's name", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([
      { code: "EMP1", user: { uuid: "u-1", name: "Reviewer One" } },
    ] as never);

    const { result } = renderHook(() => useReviewerOptions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ code: "u-1", name: "Reviewer One" }]);
  });

  it("filters out employees with no user uuid", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([{ code: "EMP1", user: {} }] as never);

    const { result } = renderHook(() => useReviewerOptions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("falls back to the employee code, then the uuid, when the user has no name", async () => {
    vi.mocked(searchHrmsEmployees).mockResolvedValue([
      { code: "EMP1", user: { uuid: "u-1" } },
    ] as never);

    const { result } = renderHook(() => useReviewerOptions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ code: "u-1", name: "EMP1" }]);
  });
});
