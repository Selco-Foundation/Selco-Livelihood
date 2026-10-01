import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExcelRoundTrip } from "./use-excel-round-trip";

vi.mock("../utils/file-download", () => ({ triggerBrowserDownload: vi.fn() }));

const messages = { downloadFailed: "Download failed", uploadFailed: "Upload failed" };

function file(blob: Blob = new Blob(["x"]), filename = "f.xlsx") {
  return { blob, filename };
}

describe("useExcelRoundTrip", () => {
  describe("downloadTemplate", () => {
    it("does nothing when download is null", async () => {
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate: null, create: null, messages }));

      await act(async () => result.current.downloadTemplate());

      expect(result.current.status).toBe("idle");
    });

    it("fails with the precheck message without calling download, when precheck returns one", async () => {
      const download = vi.fn();
      const { result } = renderHook(() =>
        useExcelRoundTrip({ download, validate: null, create: null, precheck: () => "Not ready", messages }),
      );

      await act(async () => result.current.downloadTemplate());

      expect(download).not.toHaveBeenCalled();
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("Not ready");
      expect(result.current.errorIsGuidance).toBe(true);
    });

    it("goes idle again on a successful download", async () => {
      const download = vi.fn().mockResolvedValue(file());
      const { result } = renderHook(() => useExcelRoundTrip({ download, validate: null, create: null, messages }));

      await act(async () => result.current.downloadTemplate());

      expect(result.current.status).toBe("idle");
    });

    it("surfaces the thrown error's own message and whether it's a guidance (4xx) error", async () => {
      const download = vi.fn().mockRejectedValue(Object.assign(new Error("No sites available"), { status: 400 }));
      const { result } = renderHook(() => useExcelRoundTrip({ download, validate: null, create: null, messages }));

      await act(async () => result.current.downloadTemplate());

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("No sites available");
      expect(result.current.errorIsGuidance).toBe(true);
    });

    it("falls back to the generic downloadFailed message for a non-Error rejection", async () => {
      const download = vi.fn().mockRejectedValue("boom");
      const { result } = renderHook(() => useExcelRoundTrip({ download, validate: null, create: null, messages }));

      await act(async () => result.current.downloadTemplate());

      expect(result.current.errorMessage).toBe("Download failed");
      expect(result.current.errorIsGuidance).toBe(false);
    });
  });

  describe("uploadAndValidate", () => {
    it("returns null and does nothing when validate is null", async () => {
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate: null, create: null, messages }));

      const outcome = await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(outcome).toBeNull();
    });

    it("goes to 'invalid' and clears validatedFile when the validation reports errors", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(), errorCount: 2 });
      const { result } = renderHook(() =>
        useExcelRoundTrip({ download: null, validate, create: null, messages }),
      );

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(result.current.status).toBe("invalid");
      expect(result.current.errorCount).toBe(2);
      expect(result.current.previewHasErrors).toBe(true);
      expect(result.current.validatedFile).toBeNull();
    });

    it("with autoCreate: false, stores the validated file and goes idle without calling create", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(), errorCount: 0 });
      const create = vi.fn();
      const { result } = renderHook(() =>
        useExcelRoundTrip({ download: null, validate, create, autoCreate: false, messages }),
      );

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(create).not.toHaveBeenCalled();
      expect(result.current.status).toBe("idle");
      expect(result.current.validatedFile).not.toBeNull();
    });

    it("with autoCreate true (default) and no create function, goes to 'done' without calling create", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(), errorCount: 0 });
      const { result } = renderHook(() =>
        useExcelRoundTrip({ download: null, validate, create: null, messages }),
      );

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(result.current.status).toBe("done");
    });

    it("on a clean validation with autoCreate true, calls create and returns its result", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(), errorCount: 0 });
      const create = vi.fn().mockResolvedValue({ result: "created-id" });
      const { result } = renderHook(() =>
        useExcelRoundTrip<string>({ download: null, validate, create, messages }),
      );

      const outcome = await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ filename: "f.xlsx" }));
      expect(outcome).toBe("created-id");
      expect(result.current.status).toBe("done");
    });

    it("updates previewFile when create returns its own annotated file", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(new Blob(["v"]), "validated.xlsx"), errorCount: 0 });
      const createdFile = file(new Blob(["c"]), "created.xlsx");
      const create = vi.fn().mockResolvedValue({ result: "x", file: createdFile });
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate, create, messages }));

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(result.current.previewFile).toEqual(createdFile);
    });

    it("surfaces the thrown error's message when validate rejects", async () => {
      const validate = vi.fn().mockRejectedValue(new Error("Bad format"));
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate, create: null, messages }));

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("Bad format");
    });
  });

  describe("createFromValidated", () => {
    it("returns null when there is no validated file", async () => {
      const create = vi.fn();
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate: null, create, messages }));

      const outcome = await act(async () => result.current.createFromValidated());

      expect(outcome).toBeNull();
      expect(create).not.toHaveBeenCalled();
    });

    it("applies the file held from the last clean validation", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(new Blob(["v"]), "validated.xlsx"), errorCount: 0 });
      const create = vi.fn().mockResolvedValue({ result: true });
      const { result } = renderHook(() =>
        useExcelRoundTrip<boolean>({ download: null, validate, create, autoCreate: false, messages }),
      );

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));
      const outcome = await act(async () => result.current.createFromValidated());

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ filename: "validated.xlsx" }));
      expect(outcome).toBe(true);
      expect(result.current.status).toBe("done");
    });

    it("uses createFailed over uploadFailed as the fallback message on a non-Error rejection", async () => {
      const validate = vi.fn().mockResolvedValue({ file: file(), errorCount: 0 });
      const create = vi.fn().mockRejectedValue("boom");
      const { result } = renderHook(() =>
        useExcelRoundTrip({
          download: null,
          validate,
          create,
          autoCreate: false,
          messages: { ...messages, createFailed: "Create failed" },
        }),
      );

      await act(async () => result.current.uploadAndValidate(new File(["x"], "f.xlsx")));
      await act(async () => result.current.createFromValidated());

      expect(result.current.errorMessage).toBe("Create failed");
    });
  });

  describe("isBusy", () => {
    it("is true only while downloading/validating/creating, not idle/done/error/invalid", async () => {
      let resolveDownload: (() => void) | undefined;
      const download = vi.fn(
        () =>
          new Promise<{ blob: Blob; filename: string }>((resolve) => {
            resolveDownload = () => resolve(file());
          }),
      );
      const { result } = renderHook(() => useExcelRoundTrip({ download, validate: null, create: null, messages }));

      act(() => {
        void result.current.downloadTemplate();
      });
      await waitFor(() => expect(result.current.status).toBe("downloading"));
      expect(result.current.isBusy).toBe(true);

      await act(async () => {
        resolveDownload?.();
      });
      expect(result.current.isBusy).toBe(false);
    });
  });

  describe("downloadPreview", () => {
    it("does nothing when there is no preview file yet", () => {
      const { result } = renderHook(() => useExcelRoundTrip({ download: null, validate: null, create: null, messages }));

      expect(() => result.current.downloadPreview()).not.toThrow();
    });
  });
});
