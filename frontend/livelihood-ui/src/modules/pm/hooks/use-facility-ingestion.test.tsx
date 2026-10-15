import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useFacilityIngestion } from "./use-facility-ingestion";
import {
  createFacilitiesAndUpdateProject,
  downloadFacilityIngestionTemplate,
  validateFacilitiesExcel,
} from "../services/ingestion";
import { triggerBrowserDownload } from "../utils/file-download";
import type { GeographyDetails } from "../types/project";

vi.mock("../services/ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/ingestion")>();
  return {
    ...actual,
    downloadFacilityIngestionTemplate: vi.fn(),
    validateFacilitiesExcel: vi.fn(),
    createFacilitiesAndUpdateProject: vi.fn(),
  };
});

vi.mock("../utils/file-download", () => ({ triggerBrowserDownload: vi.fn() }));

const geography: GeographyDetails = { states: [{ code: "KA" }] };

beforeEach(() => {
  vi.mocked(downloadFacilityIngestionTemplate).mockReset();
  vi.mocked(validateFacilitiesExcel).mockReset();
  vi.mocked(createFacilitiesAndUpdateProject).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useFacilityIngestion", () => {
  it("downloads the facility template for the given project/geography when ready", async () => {
    vi.mocked(downloadFacilityIngestionTemplate).mockResolvedValue({ blob: new Blob(["x"]), filename: "f.xlsx" });
    const { result } = renderHook(() => useFacilityIngestion("project-1", geography));

    await act(async () => result.current.downloadTemplate());

    expect(downloadFacilityIngestionTemplate).toHaveBeenCalledWith("project-1", geography, "token-1", { uuid: "u1" });
    expect(triggerBrowserDownload).toHaveBeenCalled();
  });

  it("is not ready (download does nothing) when projectId is undefined", async () => {
    const { result } = renderHook(() => useFacilityIngestion(undefined, geography));

    await act(async () => result.current.downloadTemplate());

    expect(downloadFacilityIngestionTemplate).not.toHaveBeenCalled();
  });

  it("validates and then creates/updates the project on a clean upload", async () => {
    vi.mocked(validateFacilitiesExcel).mockResolvedValue({ file: { blob: new Blob(["v"]), filename: "v.xlsx" }, errorCount: 0 });
    vi.mocked(createFacilitiesAndUpdateProject).mockResolvedValue({ blob: new Blob(["r"]), filename: "r.xlsx" });
    const { result } = renderHook(() => useFacilityIngestion("project-1", geography));

    await act(async () => result.current.uploadAndValidate(new File(["x"], "sites.xlsx")));

    expect(validateFacilitiesExcel).toHaveBeenCalledWith(expect.any(File), "project-1", "token-1", { uuid: "u1" });
    expect(createFacilitiesAndUpdateProject).toHaveBeenCalled();
    expect(result.current.status).toBe("done");
  });
});
