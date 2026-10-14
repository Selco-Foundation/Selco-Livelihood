import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useSaveProject } from "./use-create-project";
import { createProject, updateProject } from "../services/project";
import { pmKeys } from "./query-keys";
import type { Project } from "../types/project";

vi.mock("../services/project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/project")>();
  return { ...actual, createProject: vi.fn(), updateProject: vi.fn() };
});

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

beforeEach(() => {
  vi.mocked(createProject).mockReset();
  vi.mocked(updateProject).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useSaveProject", () => {
  it("creates a new project when it has no id", async () => {
    const project: Project = { tenantId: "tenant-1" };
    vi.mocked(createProject).mockResolvedValue({ ...project, id: "p1" });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSaveProject(), { wrapper });
    result.current.mutate(project);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(createProject).toHaveBeenCalledWith(project, "token-1", { uuid: "u1" });
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("updates an existing project when it has an id", async () => {
    const project: Project = { id: "p1", tenantId: "tenant-1" };
    vi.mocked(updateProject).mockResolvedValue(project);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useSaveProject(), { wrapper });
    result.current.mutate(project);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateProject).toHaveBeenCalledWith(project, "token-1", { uuid: "u1" });
    expect(createProject).not.toHaveBeenCalled();
  });

  it("invalidates the projects() query key on success", async () => {
    vi.mocked(createProject).mockResolvedValue({ id: "p1", tenantId: "tenant-1" });
    const { wrapper, invalidateQueries } = createWrapper();

    const { result } = renderHook(() => useSaveProject(), { wrapper });
    result.current.mutate({ tenantId: "tenant-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: pmKeys.projects() });
  });
});
