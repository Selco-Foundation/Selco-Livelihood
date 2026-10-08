import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useVendorUserOptions } from "./use-vendor-user-options";

vi.mock("../services/vendor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor")>();
  return { ...actual, searchVendorOrgUsers: vi.fn() };
});

import { searchVendorOrgUsers } from "../services/vendor";

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
  vi.mocked(searchVendorOrgUsers).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorUserOptions", () => {
  it("never searches when there's no selected organization", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorUserOptions(undefined), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchVendorOrgUsers).not.toHaveBeenCalled();
  });

  it("fetches the first page for the given organization", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrgUsers).mockResolvedValue({
      options: [{ code: "u1", name: "Vendor One" }],
      total: 1,
    });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorUserOptions("org-1"), { wrapper });

    await waitFor(() => expect(result.current.options).toEqual([{ code: "u1", name: "Vendor One" }]));
    expect(searchVendorOrgUsers).toHaveBeenCalledWith("org-1", expect.any(String), 10, 0, "token-1", user);
    expect(result.current.hasMore).toBe(false);
  });

  it("appends the next page's options and stops once every row has loaded", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrgUsers)
      .mockResolvedValueOnce({ options: [{ code: "u1", name: "Vendor One" }], total: 2 })
      .mockResolvedValueOnce({ options: [{ code: "u2", name: "Vendor Two" }], total: 2 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorUserOptions("org-1"), { wrapper });

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.options).toEqual([
        { code: "u1", name: "Vendor One" },
        { code: "u2", name: "Vendor Two" },
      ]),
    );
    expect(searchVendorOrgUsers).toHaveBeenLastCalledWith("org-1", expect.any(String), 10, 1, "token-1", user);
    expect(result.current.hasMore).toBe(false);
  });

  it("merges in the pinned vendor when it isn't already in the loaded page", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrgUsers).mockResolvedValue({ options: [{ code: "u1", name: "Vendor One" }], total: 1 });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorUserOptions("org-1", { code: "u9", name: "Pinned Vendor" }), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.options).toEqual([
        { code: "u9", name: "Pinned Vendor" },
        { code: "u1", name: "Vendor One" },
      ]),
    );
  });
});
