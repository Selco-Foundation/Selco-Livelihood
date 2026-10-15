import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, i18n } from "@/shared";
import { fetchFacilities } from "@/shared/api/facility";
import { searchProjectFacilities } from "./project";
import {
  checkInstallationScope,
  createScopeFromSheet,
  downloadScopeTemplate,
  InstallationScopeApiError,
  searchFieldPlanFacilities,
  searchFieldPlanFacilityCounts,
  validateScopeSheet,
} from "./installation-scope";
import type { GeographyDetails } from "../types/project";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, apiClient: { post: vi.fn(), get: vi.fn() } };
});

vi.mock("@/shared/api/facility", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/facility")>();
  return { ...actual, fetchFacilities: vi.fn() };
});

vi.mock("./project", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./project")>();
  return { ...actual, searchProjectFacilities: vi.fn() };
});

// i18n isn't initialized in tests, so i18n.t() returns undefined for any key rather than
// echoing the key back the way real i18next does once loaded — stub it to match production.
beforeEach(() => {
  vi.spyOn(i18n, "t").mockImplementation(((key: string) => key) as typeof i18n.t);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const geography: GeographyDetails = {
  states: [{ code: "KA" }],
  districts: [{ code: "D1", stateCode: "KA" }],
  blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }],
};

describe("checkInstallationScope", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts the plan's own boundary tree with no fieldplan_id, since the plan doesn't exist yet", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        addableSiteCount: 5,
        candidatesInGeography: 5,
        candidatesInSectors: 5,
        skippedNoSolution: [],
        skippedLockedElsewhere: [],
        reason: null,
      },
    });

    const result = await checkInstallationScope("project-1", ["SOLAR"], geography, "token-1");

    expect(apiClient.post).toHaveBeenCalledWith(
      "/ingestion-service/template/installationScopePreflight",
      expect.objectContaining({ project_id: "project-1", sectors: ["SOLAR"] }),
      expect.anything(),
    );
    expect(result.addableSiteCount).toBe(5);
  });
});

describe("downloadScopeTemplate", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
    vi.mocked(searchProjectFacilities).mockReset();
    vi.mocked(fetchFacilities).mockReset();
  });

  it("scopes the boundary tree to facilities linked to the project AND matching a requested sector", async () => {
    vi.mocked(searchProjectFacilities).mockResolvedValue([{ facilityId: "f1" }, { facilityId: "f2" }]);
    vi.mocked(fetchFacilities).mockResolvedValue({
      facilities: [
        { boundaryCode: "B1_f1", facilityId: "f1", facilityType: "SOLAR" },
        { boundaryCode: "B1_f2", facilityId: "f2", facilityType: "MACHINE" },
        { boundaryCode: "B1_f3", facilityId: "f3", facilityType: "SOLAR" },
      ],
      total: 3,
    });
    vi.mocked(apiClient.post).mockResolvedValue({ data: new Blob(["workbook"]) });

    await downloadScopeTemplate("plan-1", "project-1", ["SOLAR"], geography, "token-1");

    const body = vi.mocked(apiClient.post).mock.calls[0][1] as {
      boundary_data: { children: Array<{ children: Array<{ children: unknown[] }> }> };
    };
    const leafBlocks = body.boundary_data.children[0].children[0].children;
    expect(leafBlocks).toEqual([expect.objectContaining({ boundaryCode: "B1_f1" })]);
  });

  it("returns the downloaded blob under an installation-scope filename", async () => {
    vi.mocked(searchProjectFacilities).mockResolvedValue([]);
    vi.mocked(fetchFacilities).mockResolvedValue({ facilities: [], total: 0 });
    const blob = new Blob(["workbook"]);
    vi.mocked(apiClient.post).mockResolvedValue({ data: blob });

    const result = await downloadScopeTemplate("plan-1", "project-1", ["SOLAR"], geography, "token-1");

    expect(result).toEqual({ blob, filename: "installation-scope-plan-1.xlsx" });
  });
});

describe("validateScopeSheet", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns the annotated blob and error count on success", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: new Blob(["annotated"]),
      headers: { "x-error-count": "1" },
    });

    const result = await validateScopeSheet(new File(["x"], "scope.xlsx"), "plan-1", "token-1");

    expect(result.errorCount).toBe(1);
    expect(result.file.filename).toBe("installation-scope-validated-scope.xlsx");
  });

  it("throws InstallationScopeApiError on failure", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { data: new Blob([JSON.stringify({ Errors: [{ message: "Bad row" }] })]), status: 400 },
    });

    await expect(validateScopeSheet(new File(["x"], "scope.xlsx"), "plan-1", "token-1")).rejects.toMatchObject({
      message: "Bad row",
      status: 400,
    });
    await expect(
      validateScopeSheet(new File(["x"], "scope.xlsx"), "plan-1", "token-1"),
    ).rejects.toBeInstanceOf(InstallationScopeApiError);
  });
});

describe("createScopeFromSheet", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("creates the scope and reads back entries via searchFieldPlanFacilities", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: new Blob(["linking-report"]), headers: {} })
      .mockResolvedValueOnce({
        data: { FieldPlanFacilities: [{ facilityId: "f1", solutionId: "SOLAR", lockStatus: "LOCKED" }] },
      });

    const result = await createScopeFromSheet(
      { blob: new Blob(["validated"]), filename: "validated.xlsx" },
      "plan-1",
      "token-1",
    );

    expect(result.entries).toEqual([
      { siteId: "f1", included: true, solutionCode: "SOLAR", lockStatus: "LOCKED" },
    ]);
    expect(result.file.filename).toBe("installation-scope-linking-report.xlsx");
  });

  it("throws InstallationScopeApiError on failure", async () => {
    const errorBlob = new Blob([JSON.stringify({ error: { message: "Link failed" } })]);
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { data: errorBlob, status: 400 },
    });

    await expect(
      createScopeFromSheet({ blob: new Blob(["x"]), filename: "validated.xlsx" }, "plan-1", "token-1"),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("searchFieldPlanFacilities", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("maps camelCase rows and filters out deleted/facility-less rows", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        FieldPlanFacilities: [
          { facilityId: "f1", solutionId: "SOLAR", lockStatus: "UNLOCKED" },
          { facilityId: "f2", isdeleted: true },
          {},
        ],
      },
    });

    const result = await searchFieldPlanFacilities("plan-1", "token-1");

    expect(result).toEqual([{ siteId: "f1", included: true, solutionCode: "SOLAR", lockStatus: "UNLOCKED" }]);
  });

  it("defaults lockStatus to UNLOCKED for any value other than LOCKED", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { FieldPlanFacilities: [{ facilityId: "f1" }] },
    });

    const result = await searchFieldPlanFacilities("plan-1", "token-1");

    expect(result[0].lockStatus).toBe("UNLOCKED");
  });
});

describe("searchFieldPlanFacilityCounts", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("returns {} without a request when fieldPlanIds is empty", async () => {
    const result = await searchFieldPlanFacilityCounts([]);

    expect(result).toEqual({});
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("groups rows into a fieldPlanId -> count map, excluding deleted rows", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        FieldPlanFacilities: [
          { fieldPlanId: "plan-1" },
          { fieldPlanId: "plan-1" },
          { fieldPlanId: "plan-2", isdeleted: true },
          { fieldPlanId: "plan-3" },
        ],
      },
    });

    const result = await searchFieldPlanFacilityCounts(["plan-1", "plan-2", "plan-3"]);

    expect(result).toEqual({ "plan-1": 2, "plan-3": 1 });
  });
});
