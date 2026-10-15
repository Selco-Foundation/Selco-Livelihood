import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerBrowserDownload } from "./file-download";

describe("triggerBrowserDownload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates an object URL, clicks a hidden download link, then removes it", () => {
    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const createElementSpy = vi.spyOn(document, "createElement");

    triggerBrowserDownload({ blob: new Blob(["data"]), filename: "scope.xlsx" });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    const link = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.download).toBe("scope.xlsx");
    expect(link.href).toBe("blob:mock-url");
    expect(link.style.display).toBe("none");
    expect(link.isConnected).toBe(false);

    void clickSpy;
  });

  it("revokes the object URL after a delay, not immediately", () => {
    triggerBrowserDownload({ blob: new Blob(["data"]), filename: "scope.xlsx" });

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(60_000);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
