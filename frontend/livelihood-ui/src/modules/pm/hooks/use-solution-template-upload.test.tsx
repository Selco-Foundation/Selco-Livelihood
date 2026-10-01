import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useSolutionTemplateUpload } from "./use-solution-template-upload";
import {
  createSolutionTemplate,
  downloadSolutionTemplate,
  validateSolutionTemplate,
} from "../services/installation-template";
import { triggerBrowserDownload } from "../utils/file-download";

vi.mock("../services/installation-template", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/installation-template")>();
  return {
    ...actual,
    downloadSolutionTemplate: vi.fn(),
    validateSolutionTemplate: vi.fn(),
    createSolutionTemplate: vi.fn(),
  };
});

vi.mock("../utils/file-download", () => ({ triggerBrowserDownload: vi.fn() }));

beforeEach(() => {
  vi.mocked(downloadSolutionTemplate).mockReset();
  vi.mocked(validateSolutionTemplate).mockReset();
  vi.mocked(createSolutionTemplate).mockReset();
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1" } });
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("useSolutionTemplateUpload", () => {
  it("downloads the per-solution template", async () => {
    vi.mocked(downloadSolutionTemplate).mockResolvedValue({ blob: new Blob(["x"]), filename: "t.xlsx" });
    const { result } = renderHook(() => useSolutionTemplateUpload("plan-1", "SOLAR"));

    await act(async () => result.current.downloadTemplate());

    expect(downloadSolutionTemplate).toHaveBeenCalledWith("plan-1", "SOLAR", "token-1", { uuid: "u1" });
    expect(triggerBrowserDownload).toHaveBeenCalled();
  });

  it("holds the validated file rather than auto-creating (two-phase: autoCreate is false)", async () => {
    vi.mocked(validateSolutionTemplate).mockResolvedValue({ file: { blob: new Blob(["v"]), filename: "v.xlsx" }, errorCount: 0 });
    const { result } = renderHook(() => useSolutionTemplateUpload("plan-1", "SOLAR"));

    await act(async () => result.current.uploadAndValidate(new File(["x"], "t.xlsx")));

    expect(createSolutionTemplate).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
    expect(result.current.validatedFile).not.toBeNull();
  });

  it("createTemplate() applies the held validated file and returns the boolean result", async () => {
    vi.mocked(validateSolutionTemplate).mockResolvedValue({ file: { blob: new Blob(["v"]), filename: "v.xlsx" }, errorCount: 0 });
    vi.mocked(createSolutionTemplate).mockResolvedValue(true);
    const { result } = renderHook(() => useSolutionTemplateUpload("plan-1", "SOLAR"));

    await act(async () => result.current.uploadAndValidate(new File(["x"], "t.xlsx")));
    const outcome = await act(async () => result.current.createTemplate());

    expect(createSolutionTemplate).toHaveBeenCalledWith("plan-1", "SOLAR", expect.anything(), "token-1", { uuid: "u1" });
    expect(outcome).toBe(true);
  });

  it("createTemplate() returns false when there is nothing validated to create from", async () => {
    const { result } = renderHook(() => useSolutionTemplateUpload("plan-1", "SOLAR"));

    const outcome = await act(async () => result.current.createTemplate());

    expect(outcome).toBe(false);
  });
});
