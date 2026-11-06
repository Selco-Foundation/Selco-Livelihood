import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useProjectsSearch } from "./use-projects-search";
import { searchProjects } from "../services/project";

vi.mock("../services/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/project")>();
  return { ...actual, searchProjects: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const pmUser = { roles: [{ code: "PROJECT_MANAGER" }] };

beforeEach(() => {
  vi.mocked(searchProjects).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: pmUser });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useProjectsSearch", () => {
  it("searches scoped to subProjectTypeId PROJECT with default paging", async () => {
    vi.mocked(searchProjects).mockResolvedValue({ projects: [], totalCount: 0 });

    renderHook(() => useProjectsSearch({}), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(searchProjects).toHaveBeenCalledWith(
        { criteria: { subProjectTypeId: "PROJECT" }, filters: undefined, limit: 10, offset: 0 },
        "token-1",
        pmUser,
      ),
    );
  });

  it("includes name in the criteria when given", async () => {
    vi.mocked(searchProjects).mockResolvedValue({ projects: [], totalCount: 0 });

    renderHook(() => useProjectsSearch({ name: "Foo" }), { wrapper: createWrapper() });

    await waitFor(() =>
      expect(searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({ criteria: { subProjectTypeId: "PROJECT", name: "Foo" } }),
        "token-1",
        pmUser,
      ),
    );
  });

  it("does not search for a user who isn't a Project Manager", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

    const { result } = renderHook(() => useProjectsSearch({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchProjects).not.toHaveBeenCalled();
  });

  it("does not search when accessToken is missing", async () => {
    useAuthStore.setState({ accessToken: null });

    const { result } = renderHook(() => useProjectsSearch({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchProjects).not.toHaveBeenCalled();
  });
});
