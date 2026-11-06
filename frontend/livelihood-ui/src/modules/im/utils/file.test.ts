import { describe, expect, it } from "vitest";
import { formatFileSize, getAttachmentKind, getFileName } from "./file";

describe("getAttachmentKind", () => {
  it("classifies common image extensions as image", () => {
    for (const ext of ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]) {
      expect(getAttachmentKind(`http://files/a.${ext}`)).toBe("image");
    }
  });

  it("classifies a pdf extension as pdf", () => {
    expect(getAttachmentKind("http://files/report.pdf")).toBe("pdf");
  });

  it("classifies any other extension as document", () => {
    expect(getAttachmentKind("http://files/report.docx")).toBe("document");
  });

  it("ignores query strings and fragments when resolving the extension", () => {
    expect(getAttachmentKind("http://files/photo.png?sig=abc#frag")).toBe("image");
  });

  it("is case-insensitive about the extension", () => {
    expect(getAttachmentKind("http://files/photo.PNG")).toBe("image");
  });

  it("classifies a url with no extension as document", () => {
    expect(getAttachmentKind("http://files/noext")).toBe("document");
  });
});

describe("getFileName", () => {
  it("extracts the file name from the end of the path", () => {
    expect(getFileName("http://files/folder/photo.jpg")).toBe("photo.jpg");
  });

  it("strips query strings and fragments before extracting the name", () => {
    expect(getFileName("http://files/photo.jpg?sig=abc#frag")).toBe("photo.jpg");
  });

  it("decodes URI-encoded characters in the file name", () => {
    expect(getFileName("http://files/my%20photo.jpg")).toBe("my photo.jpg");
  });

  it("falls back to the raw src when there is no path segment to pop", () => {
    expect(getFileName("")).toBe("");
  });
});

describe("formatFileSize", () => {
  it("formats bytes under 1024 as B", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes under 1024 KB as a rounded KB value", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes and above as a value with one decimal place", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("treats exactly 1024 bytes as the KB boundary", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("treats exactly 1024 KB as the MB boundary", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});
