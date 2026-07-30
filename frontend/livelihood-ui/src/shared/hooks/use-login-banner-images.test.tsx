import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore } from "@/test/mocks/auth";
import * as mdmsApi from "../api/mdms";
import { useLoginBannerImages } from "./use-login-banner-images";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("useLoginBannerImages", () => {
  it("returns an empty array before the query resolves", () => {
    vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useLoginBannerImages(), { wrapper: createWrapper() });
    expect(result.current).toEqual([]);
  });

  it("returns the fetched banner images once resolved", async () => {
    vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([
      { image: "https://cdn/banner.jpg", title: "Banner", discription: "d" },
    ]);
    const { result } = renderHook(() => useLoginBannerImages(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current).toHaveLength(1));
  });
});
