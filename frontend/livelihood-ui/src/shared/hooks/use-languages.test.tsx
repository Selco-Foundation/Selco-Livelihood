import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";
import { useLanguages } from "./use-languages";

vi.mock("../api/mdms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/mdms")>();
  return {
    ...actual,
    fetchLanguages: vi.fn(),
  };
});

import { fetchLanguages } from "../api/mdms";

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
  vi.mocked(fetchLanguages).mockReset();
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

describe("useLanguages", () => {
  it("returns the fetched languages once loaded", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchLanguages).mockResolvedValue([
      { code: "hi_IN", label: "Hindi", nativeLabel: "हिन्दी" },
    ]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLanguages(), { wrapper });

    await waitFor(() =>
      expect(result.current).toEqual([{ code: "hi_IN", label: "Hindi", nativeLabel: "हिन्दी" }]),
    );

    expect(fetchLanguages).toHaveBeenCalledWith("token-1", authedUser);
  });

  it("returns the English fallback before the query resolves", () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchLanguages).mockReturnValue(new Promise(() => {}));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLanguages(), { wrapper });

    expect(result.current).toEqual([{ code: "en_IN", label: "English", nativeLabel: "English" }]);
  });

  it("returns the English fallback when the fetch resolves with an empty list", async () => {
    useAuthStore.setState({ accessToken: "token-1", user: authedUser });
    vi.mocked(fetchLanguages).mockResolvedValue([]);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLanguages(), { wrapper });

    await waitFor(() => expect(fetchLanguages).toHaveBeenCalled());
    expect(result.current).toEqual([{ code: "en_IN", label: "English", nativeLabel: "English" }]);
  });

  it("fetches without an access token, passing undefined", async () => {
    useAuthStore.setState({ accessToken: null, user: null });
    vi.mocked(fetchLanguages).mockResolvedValue([]);
    const { wrapper } = createWrapper();

    renderHook(() => useLanguages(), { wrapper });

    await waitFor(() => expect(fetchLanguages).toHaveBeenCalledWith(undefined, null));
  });
});
