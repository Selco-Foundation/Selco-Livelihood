import { describe, expect, it } from "vitest";
import { formatFileSize, getAttachmentKind, getFileName } from "./file";

describe("getAttachmentKind", () => {
  it.each(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"])(
    "classifies .%s as an image",
    (ext) => {
      expect(getAttachmentKind(`https://example.com/file.${ext}`)).toBe("image");
    },
  );

  it("classifies .pdf as pdf", () => {
    expect(getAttachmentKind("https://example.com/file.pdf")).toBe("pdf");
  });

  it("classifies an unknown extension as document", () => {
    expect(getAttachmentKind("https://example.com/file.docx")).toBe("document");
  });

  it("is case-insensitive on the extension", () => {
    expect(getAttachmentKind("https://example.com/file.PNG")).toBe("image");
  });

  it("strips query strings before checking the extension", () => {
    expect(getAttachmentKind("https://example.com/file.png?token=abc")).toBe("image");
  });

  it("strips hash fragments before checking the extension", () => {
    expect(getAttachmentKind("https://example.com/file.pdf#page=2")).toBe("pdf");
  });
});

describe("getFileName", () => {
  it("extracts the last path segment", () => {
    expect(getFileName("https://example.com/uploads/photo.jpg")).toBe("photo.jpg");
  });

  it("strips query strings and hashes before extracting the name", () => {
    expect(getFileName("https://example.com/uploads/photo.jpg?token=abc#frag")).toBe("photo.jpg");
  });

  it("URI-decodes the file name", () => {
    expect(getFileName("https://example.com/uploads/my%20photo.jpg")).toBe("my photo.jpg");
  });

  it("returns an empty string for an empty src", () => {
    expect(getFileName("")).toBe("");
  });
});

describe("formatFileSize", () => {
  it("formats sizes under 1024 bytes as bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats exactly 1023 bytes as bytes (just under the KB boundary)", () => {
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats exactly 1024 bytes as 1 KB (the KB boundary)", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("rounds KB values", () => {
    expect(formatFileSize(1536)).toBe("2 KB");
  });

  it("formats exactly 1024*1024 bytes as 1.0 MB (the MB boundary)", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats large sizes as MB with one decimal", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
