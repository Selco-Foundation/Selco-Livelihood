import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, tenantId } from "@/shared";
import { createProject, scheduleProject, searchProjectFacilities, searchProjects, updateProject } from "./project";
import type { Project } from "../types/project";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() }, tenantId: vi.fn(() => "tenant-1") };
});

function project(overrides: Partial<Project> = {}): Project {
  return { tenantId: "tenant-1", name: "Project A", ...overrides };
}

describe("createProject", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.useFakeTimers();
  });

  it("posts the project under Projects[] and polls _search until the row lands", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { Project: [{ id: "p1" }] } })
      .mockResolvedValueOnce({
        data: { Project: [{ project: { id: "p1", tenantId: "tenant-1", additionalDetails: {} } }] },
      });

    const promise = createProject(project(), "token-1");
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/project/v1/_create",
      expect.objectContaining({
        Projects: [expect.objectContaining({ name: "Project A" })],
        apiOperation: "CREATE",
      }),
    );
    expect(result).toEqual({ id: "p1", tenantId: "tenant-1", additionalDetails: {} });
  });

  it("throws PROJECT_CREATE_FAILED when the response has no created id", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { Project: [{}] } });

    await expect(createProject(project(), "token-1")).rejects.toThrow("PROJECT_CREATE_FAILED");
  });

  it("retries _search with backoff before giving up", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { Project: [{ id: "p1" }] } })
      .mockResolvedValue({ data: { Project: [] } });

    const promise = createProject(project(), "token-1");
    const expectation = expect(promise).rejects.toThrow("PROJECT_NOT_CONFIRMED");
    await vi.runAllTimersAsync();
    await expectation;
  });
});

describe("updateProject", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the project under Projects[] with apiOperation UPDATE and returns the updated row", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { Project: [{ id: "p1", name: "Renamed" }] } });

    const result = await updateProject(project({ id: "p1" }), "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/project/v1/_update",
      expect.objectContaining({ apiOperation: "UPDATE" }),
    );
    expect(result).toEqual({ id: "p1", name: "Renamed" });
  });

  it("falls back to the input project when the response has no updated row", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });
    const input = project({ id: "p1" });

    const result = await updateProject(input, "token-1");

    expect(result).toBe(input);
  });
});

describe("searchProjects", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(tenantId).mockReset().mockReturnValue("tenant-1");
  });

  it("without filters, makes a single request and defaults status to DRAFT", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Project: [{ project: project({ id: "p1" }) }], totalCount: 1 },
    });

    const result = await searchProjects({});

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      projects: [{ project: expect.objectContaining({ id: "p1" }), status: "DRAFT" }],
      totalCount: 1,
    });
  });

  it("uses the project's additionalDetails.status when present", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Project: [{ project: project({ id: "p1", additionalDetails: { status: "SCHEDULED" } }) }] },
    });

    const result = await searchProjects({});

    expect(result.projects[0].status).toBe("SCHEDULED");
  });

  it("defaults totalCount to the page length when the server omits it", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Project: [{ project: project() }, { project: project() }] },
    });

    const result = await searchProjects({});

    expect(result.totalCount).toBe(2);
  });

  it("with a stateCodes filter, reads every page and filters by geography before paginating", async () => {
    const inKarnataka = project({
      id: "p1",
      additionalDetails: { geographyDetails: { states: [{ code: "KA" }] } },
    });
    const inAssam = project({
      id: "p2",
      additionalDetails: { geographyDetails: { states: [{ code: "AS" }] } },
    });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { Project: [{ project: inKarnataka }, { project: inAssam }] },
    });

    const result = await searchProjects({ filters: { stateCodes: ["KA"], statuses: [] } });

    expect(result).toEqual({
      projects: [{ project: inKarnataka, status: "DRAFT" }],
      totalCount: 1,
    });
  });

  it("with a statuses filter, keeps only matching statuses", async () => {
    const draft = project({ id: "p1" });
    const scheduled = project({ id: "p2", additionalDetails: { status: "SCHEDULED" } });
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { Project: [{ project: draft }, { project: scheduled }] },
    });

    const result = await searchProjects({ filters: { stateCodes: [], statuses: ["SCHEDULED"] } });

    expect(result.projects).toEqual([{ project: scheduled, status: "SCHEDULED" }]);
  });

  it("paginates the filtered result set client-side using offset/limit", async () => {
    const projects = Array.from({ length: 3 }, (_, i) =>
      project({ id: `p${i}`, additionalDetails: { status: "SCHEDULED" } }),
    );
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { Project: projects.map((p) => ({ project: p })) },
    });

    const result = await searchProjects({
      limit: 1,
      offset: 1,
      filters: { stateCodes: [], statuses: ["SCHEDULED"] },
    });

    expect(result.totalCount).toBe(3);
    expect(result.projects).toEqual([{ project: projects[1], status: "SCHEDULED" }]);
  });
});

describe("searchProjectFacilities", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns only links that have a facilityId", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { ProjectFacilities: [{ facilityId: "f1" }, {}] },
    });

    const result = await searchProjectFacilities("project-1");

    expect(result).toEqual([{ facilityId: "f1" }]);
  });
});

describe("scheduleProject", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a nested workflow.action SCHEDULED and returns the updated project", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { Project: [{ project: project({ id: "p1" }) }] },
    });

    const result = await scheduleProject("p1", "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/project/v1/project/workflow/update",
      expect.objectContaining({ projectId: "p1", workflow: { action: "SCHEDULED" } }),
    );
    expect(result).toEqual(project({ id: "p1" }));
  });

  it("throws PROJECT_SCHEDULE_FAILED when the response has no updated project", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

    await expect(scheduleProject("p1", "token-1")).rejects.toThrow("PROJECT_SCHEDULE_FAILED");
  });
});
