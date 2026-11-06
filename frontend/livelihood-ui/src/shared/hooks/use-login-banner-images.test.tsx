import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";
import { useLoginBannerImages } from "./use-login-banner-images";

vi.mock("../api/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/mdms")>();
  return {
    ...actual,
    fetchLoginBannerImages: vi.fn(),
  };
});

import { fetchLoginBannerImages } from "../api/mdms";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const authedUser = { uuid: "user-1" };

beforeEach(() => {
  vi.mocked(fetchLoginBannerImages).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useLoginBannerImages", () => {
  it("returns the fetched images once loaded", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchLoginBannerImages).mockResolvedValue([
      { image: "img1.png", title: "Title", discription: "Desc" },
    ]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginBannerImages(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual([{ image: "img1.png", title: "Title", discription: "Desc" }]),
    );

    expect(fetchLoginBannerImages).toHaveBeenCalledWith("token-1", authedUser);
  });

  it("returns an empty array before the query resolves", () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchLoginBannerImages).mockReturnValue(new Promise(() => {}));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLoginBannerImages(), { wrapper });

    expect(result.current).toEqual([]);
  });

  it("fetches without an access token, passing undefined", async () => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(fetchLoginBannerImages).mockResolvedValue([]);
    const { wrapper } = createWrapper();

    renderHook(() => useLoginBannerImages(), { wrapper });

    await waitFor(() => expect(fetchLoginBannerImages).toHaveBeenCalledWith(undefined, null));
  });
});
