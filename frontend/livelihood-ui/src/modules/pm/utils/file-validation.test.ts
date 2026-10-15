import { describe, expect, it } from "vitest";
import { hasAcceptedExtension } from "./file-validation";

function makeFile(name: string): File {
  return new File(["content"], name);
}

describe("hasAcceptedExtension", () => {
  it("accepts a file matching a single extension", () => {
    expect(hasAcceptedExtension(makeFile("scope.xlsx"), ".xlsx")).toBe(true);
  });

  it("rejects a file not matching the extension", () => {
    expect(hasAcceptedExtension(makeFile("scope.csv"), ".xlsx")).toBe(false);
  });

  it("is case-insensitive on both extension and filename", () => {
    expect(hasAcceptedExtension(makeFile("Scope.XLSX"), ".xlsx")).toBe(true);
    expect(hasAcceptedExtension(makeFile("scope.xlsx"), ".XLSX")).toBe(true);
  });

  it("accepts when any of a comma-separated extension list matches", () => {
    expect(hasAcceptedExtension(makeFile("scope.csv"), ".xlsx,.csv")).toBe(true);
    expect(hasAcceptedExtension(makeFile("scope.txt"), ".xlsx,.csv")).toBe(false);
  });

  it("trims whitespace around each extension in the list", () => {
    expect(hasAcceptedExtension(makeFile("scope.csv"), ".xlsx, .csv")).toBe(true);
  });

  it("accepts any file when the accept list is empty", () => {
    expect(hasAcceptedExtension(makeFile("scope.anything"), "")).toBe(true);
  });

  it("ignores blank entries in the accept list", () => {
    expect(hasAcceptedExtension(makeFile("scope.xlsx"), ",,.xlsx,,")).toBe(true);
  });
});
