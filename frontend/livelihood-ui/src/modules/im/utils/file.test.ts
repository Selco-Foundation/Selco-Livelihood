/**
 * Unit tests for src/modules/im/utils/file.ts.
 *
 * These are pure, side-effect-free string/number utilities used to render chat
 * attachments (classifying attachment type, deriving a display file name, and
 * formatting a byte count as a human-readable size). None of them touch the
 * DOM, React, i18n, or routing, so the tests call the functions directly with
 * no mocking, providers, or wrappers required.
 */
import { describe, expect, it } from "vitest";
import { formatFileSize, getAttachmentKind, getFileName } from "./file";

// getAttachmentKind(src) strips any query string (?...) and hash (#...) from
// the URL, takes the file extension after the last ".", lowercases it, and
// classifies it as "image" (known image extensions), "pdf", or "document"
// (fallback for anything else, including unknown/missing extensions).
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

// getFileName(src) strips any query string/hash from the URL, takes the last
// "/"-separated path segment, and URI-decodes it (e.g. "%20" -> " ") so
// encoded upload URLs render as a readable file name in the UI. Falls back to
// the raw src if there is no "/" segment to pop.
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

  // "".split("/").pop() is "" (a defined, falsy-but-truthy-check-passing
  // string), so the "?? src" fallback never kicks in here and the result is
  // simply the empty string, not the original (also empty) src.
  it("returns an empty string for an empty src", () => {
    expect(getFileName("")).toBe("");
  });
});

// formatFileSize(bytes) renders a byte count for display: plain bytes below
// 1024, rounded whole KB from 1024 up to (but not including) 1 MB, and MB
// with one decimal place from 1024*1024 up. The two boundaries (1024 B and
// 1024*1024 B) are exercised explicitly since they are where the unit and
// formatting both switch.
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
