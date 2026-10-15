import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useVendorOrganisationOptions } from "./use-vendor-organisation-options";

vi.mock("../services/vendor-organisation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/vendor-organisation")>();
  return { ...actual, searchVendorOrganisations: vi.fn() };
});

import { searchVendorOrganisations } from "../services/vendor-organisation";

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
  vi.mocked(searchVendorOrganisations).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useVendorOrganisationOptions", () => {
  it("never searches when there's no accessToken", async () => {
    useAuthStore.setState({ accessToken: null, user });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOrganisationOptions(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(searchVendorOrganisations).not.toHaveBeenCalled();
  });

  it("searches once a token is present, with an empty query initially", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrganisations).mockResolvedValue([{ code: "org-1", name: "Org One" }]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOrganisationOptions(), { wrapper });

    await waitFor(() => expect(result.current.options).toEqual([{ code: "org-1", name: "Org One" }]));
    expect(searchVendorOrganisations).toHaveBeenCalledWith(undefined, expect.any(String), "token-1", user);
  });

  it("re-searches with the typed query once it settles (debounced)", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrganisations).mockResolvedValue([]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOrganisationOptions(), { wrapper });
    await waitFor(() => expect(searchVendorOrganisations).toHaveBeenCalledTimes(1));

    act(() => result.current.setQuery("acme"));

    await waitFor(() => expect(searchVendorOrganisations).toHaveBeenCalledWith("acme", expect.any(String), "token-1", user), {
      timeout: 1000,
    });
  });

  it("merges in the pinned option when it isn't already in the fetched result", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrganisations).mockResolvedValue([{ code: "org-1", name: "Org One" }]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOrganisationOptions({ code: "org-9", name: "Pinned Org" }), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.options).toEqual([
        { code: "org-9", name: "Pinned Org" },
        { code: "org-1", name: "Org One" },
      ]),
    );
  });

  it("doesn't duplicate the pinned option when it's already in the fetched result", async () => {
    useAuthStore.setState({ accessToken: "token-1", user });
    vi.mocked(searchVendorOrganisations).mockResolvedValue([{ code: "org-1", name: "Org One" }]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useVendorOrganisationOptions({ code: "org-1", name: "Org One" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.options).toEqual([{ code: "org-1", name: "Org One" }]));
  });
});
