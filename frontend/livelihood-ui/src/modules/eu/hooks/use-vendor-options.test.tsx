import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useVendorOptions } from "./use-vendor-options";

vi.mock("../services/vendor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor")>();
  return { ...actual, fetchVendorOptions: vi.fn() };
});

import { fetchVendorOptions } from "../services/vendor";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const user = { uuid: "user-1" };

beforeEach(() => {
  vi.mocked(fetchVendorOptions).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorOptions", () => {
  it.each([
    ["missing accessToken", { accessToken: null, user }, "boundary-1"],
    ["missing boundaryCode", { accessToken: "token-1", user }, undefined],
  ])("never calls fetchVendorOptions when %s", async (_label, state, boundaryCode) => {
    useAuthStore.setState(state);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOptions(boundaryCode), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchVendorOptions).not.toHaveBeenCalled();
  });

  it("fetches vendor options scoped to the given boundary once both accessToken and boundaryCode are present", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(fetchVendorOptions).mockResolvedValue([{ code: "v1", name: "Vendor One" }]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOptions("boundary-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchVendorOptions).toHaveBeenCalledWith("token-1", user, "boundary-1");
    expect(result.current.data).toEqual([{ code: "v1", name: "Vendor One" }]);
  });
});
