import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useInstallationScopeIngestion } from "./use-installation-scope-ingestion";
import { createScopeFromSheet, downloadScopeTemplate, validateScopeSheet } from "../services/installation-scope";
import { triggerBrowserDownload } from "../utils/file-download";
import type { GeographyDetails } from "../types/project";

vi.mock("../services/installation-scope", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-scope")>();
  return {
    ...actual,
    downloadScopeTemplate: vi.fn(),
    validateScopeSheet: vi.fn(),
    createScopeFromSheet: vi.fn(),
  };
});

vi.mock("../utils/file-download", () => ({ triggerBrowserDownload: vi.fn() }));

const geography: GeographyDetails = { blocks: [{ code: "B1", districtCode: "D1", stateCode: "KA" }] };

beforeEach(() => {
  vi.mocked(downloadScopeTemplate).mockReset();
  vi.mocked(validateScopeSheet).mockReset();
  vi.mocked(createScopeFromSheet).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useInstallationScopeIngestion", () => {
  it("fails with a loading-guidance message and skips downloading when sectorCodes is empty", async () => {
    const { result } = renderHook(() =>
      useInstallationScopeIngestion("plan-1", "project-1", [], geography),
    );

    await act(async () => result.current.downloadTemplate());

    expect(downloadScopeTemplate).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
    expect(result.current.errorIsGuidance).toBe(true);
  });

  it("fails the same way when the project geography has no blocks yet", async () => {
    const { result } = renderHook(() =>
      useInstallationScopeIngestion("plan-1", "project-1", ["SOLAR"], {}),
    );

    await act(async () => result.current.downloadTemplate());

    expect(downloadScopeTemplate).not.toHaveBeenCalled();
    expect(result.current.status).toBe("error");
  });

  it("downloads the scope template once sectors and geography are ready", async () => {
    vi.mocked(downloadScopeTemplate).mockResolvedValue({ blob: new Blob(["x"]), filename: "scope.xlsx" });
    const { result } = renderHook(() =>
      useInstallationScopeIngestion("plan-1", "project-1", ["SOLAR"], geography),
    );

    await act(async () => result.current.downloadTemplate());

    expect(downloadScopeTemplate).toHaveBeenCalledWith(
      "plan-1", "project-1", ["SOLAR"], geography, "token-1", { uuid: "u1" },
    );
    expect(triggerBrowserDownload).toHaveBeenCalled();
  });

  it("validates and creates the scope on a clean upload, returning the entries", async () => {
    vi.mocked(validateScopeSheet).mockResolvedValue({ file: { blob: new Blob(["v"]), filename: "v.xlsx" }, errorCount: 0 });
    const entries = [{ siteId: "f1", included: true }];
    vi.mocked(createScopeFromSheet).mockResolvedValue({ entries, file: { blob: new Blob(["r"]), filename: "r.xlsx" } });
    const { result } = renderHook(() =>
      useInstallationScopeIngestion("plan-1", "project-1", ["SOLAR"], geography),
    );

    const outcome = await act(async () => result.current.uploadAndValidate(new File(["x"], "scope.xlsx")));

    expect(createScopeFromSheet).toHaveBeenCalledWith(expect.anything(), "plan-1", "token-1", { uuid: "u1" });
    expect(outcome).toEqual(entries);
  });

  it("cannot upload when planId is missing", async () => {
    const { result } = renderHook(() =>
      useInstallationScopeIngestion(undefined, "project-1", ["SOLAR"], geography),
    );

    const outcome = await act(async () => result.current.uploadAndValidate(new File(["x"], "scope.xlsx")));

    expect(outcome).toBeNull();
    expect(validateScopeSheet).not.toHaveBeenCalled();
  });
});
