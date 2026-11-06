import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useProjectById } from "./use-project-by-id";
import { searchProjects } from "../services/project";
import type { Project } from "../types/project";

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

const project: Project = { id: "project-1", tenantId: "tenant-1" };

beforeEach(() => {
  vi.mocked(searchProjects).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useProjectById", () => {
  it("searches by id and returns the found project", async () => {
    vi.mocked(searchProjects).mockResolvedValue({ projects: [{ project, status: "DRAFT" }], totalCount: 1 });

    const { result } = renderHook(() => useProjectById("project-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(searchProjects).toHaveBeenCalledWith(
      { criteria: { id: ["project-1"] }, limit: 1, offset: 0 },
      "token-1",
      { uuid: "u1" },
    );
    expect(result.current.data).toEqual(project);
  });

  it("returns null when no project is found", async () => {
    vi.mocked(searchProjects).mockResolvedValue({ projects: [], totalCount: 0 });

    const { result } = renderHook(() => useProjectById("project-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("does not search when projectId is undefined", async () => {
    const { result } = renderHook(() => useProjectById(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(searchProjects).not.toHaveBeenCalled();
  });
});
