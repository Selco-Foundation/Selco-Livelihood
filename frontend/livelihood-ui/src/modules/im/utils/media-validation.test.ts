/**
 * Unit tests for media-validation.ts.
 *
 * These functions are pure — they only inspect a `File`'s `name`/`type`/`size`
 * and return booleans or a plain `MediaValidationError | null`, with no DOM
 * rendering, network calls, or React state involved. So no mocking/providers
 * are needed; the only test helper used is `buildFile`, a small factory (from
 * `@/test/mocks/file`) that constructs a `File`-like object with a given
 * name, size (in bytes), and MIME type without needing real binary data.
 *
 * Coverage:
 * - `isAllowedImageFile` / `isAllowedVideoFile` / `isAllowedQuotationFile`:
 *   the extension-or-MIME-type allow-list checks.
 * - `validateMediaFiles`: the combined count/format/size validation used for
 *   image and video attachments.
 * - `validateQuotationFiles`: the same size/format validation applied to
 *   quotation documents (no count limit).
 */
import { describe, expect, it } from "vitest";
import { buildFile } from "@/test/mocks/file";
import {
  isAllowedImageFile,
  isAllowedQuotationFile,
  isAllowedVideoFile,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_MB,
  MAX_VIDEO_COUNT,
  validateMediaFiles,
  validateQuotationFiles,
} from "./media-validation";

// isAllowedImageFile: true if the file's extension is one of jpg/jpeg/png,
// OR its MIME type starts with "image/". Either signal alone is sufficient,
// which lets a correctly-typed-but-oddly-named file (or a correctly-named
// file with a generic/missing MIME type) still pass.
describe("isAllowedImageFile", () => {
  it("allows a jpg extension even with a generic MIME type", () => {
    expect(isAllowedImageFile(buildFile("photo.jpg", 10, "application/octet-stream"))).toBe(true);
  });

  it("allows an image/* MIME type even with an unrecognized extension", () => {
    expect(isAllowedImageFile(buildFile("photo.heic", 10, "image/heic"))).toBe(true);
  });

  it("rejects a non-image file", () => {
    expect(isAllowedImageFile(buildFile("doc.pdf", 10, "application/pdf"))).toBe(false);
  });
});

// isAllowedVideoFile: true if the extension is one of mp4/mov/avi/wmv,
// OR the MIME type starts with "video/" — same either-signal-suffices rule
// as isAllowedImageFile, just against the video extension/MIME lists.
describe("isAllowedVideoFile", () => {
  it("allows an mp4 extension", () => {
    expect(isAllowedVideoFile(buildFile("clip.mp4", 10, "application/octet-stream"))).toBe(true);
  });

  it("allows a video/* MIME type", () => {
    expect(isAllowedVideoFile(buildFile("clip.unknown", 10, "video/webm"))).toBe(true);
  });

  it("rejects a non-video file", () => {
    expect(isAllowedVideoFile(buildFile("photo.jpg", 10, "image/jpeg"))).toBe(false);
  });
});

// isAllowedQuotationFile: true if the extension is one of pdf/doc/docx,
// OR the MIME type exactly matches one of the known quotation MIME types
// (application/pdf, application/msword, or the docx OOXML type) — unlike
// the image/video checks this is an exact MIME match, not a prefix match.
describe("isAllowedQuotationFile", () => {
  it("allows a pdf extension", () => {
    expect(isAllowedQuotationFile(buildFile("quote.pdf", 10, "application/octet-stream"))).toBe(
      true,
    );
  });

  it("allows a recognized quotation MIME type", () => {
    expect(
      isAllowedQuotationFile(buildFile("quote.unknown", 10, "application/msword")),
    ).toBe(true);
  });

  it("rejects an image file", () => {
    expect(isAllowedQuotationFile(buildFile("photo.jpg", 10, "image/jpeg"))).toBe(false);
  });
});

// validateMediaFiles: validates a batch of newly-added image or video files
// against the kind-specific max count (existingCount + files.length), then
// per file checks allowed format and max size (in MB, converted to bytes).
// Checks run in this order — COUNT first, then FORMAT before SIZE per file —
// and the first failure short-circuits with that error code (plus fileName
// for FORMAT/SIZE); returns null only if every file passes every check.
describe("validateMediaFiles", () => {
  // MAX_IMAGE_COUNT + 1 files against an empty existing count exceeds the
  // image limit, so this should trip the COUNT check before any per-file
  // format/size check runs.
  it("returns a COUNT error when the total exceeds the image max", () => {
    const files = Array.from({ length: MAX_IMAGE_COUNT + 1 }, (_, i) =>
      buildFile(`img${i}.jpg`, 10, "image/jpeg"),
    );
    expect(validateMediaFiles(files, 0, "image")).toEqual({ code: "COUNT" });
  });

  // existingCount is added to the new files' length before comparing to
  // maxCount, so a single new file with existingCount already at the max
  // should still trigger COUNT even though only one file is being uploaded.
  it("counts existing files toward the max", () => {
    const files = [buildFile("img.jpg", 10, "image/jpeg")];
    expect(validateMediaFiles(files, MAX_IMAGE_COUNT, "image")).toEqual({ code: "COUNT" });
  });

  // A PDF is neither an allowed image extension nor an "image/*" MIME type,
  // so it should fail the format check for kind "image" and report the
  // offending fileName rather than the size check.
  it("returns a FORMAT error for a disallowed file", () => {
    const files = [buildFile("doc.pdf", 10, "application/pdf")];
    expect(validateMediaFiles(files, 0, "image")).toEqual({ code: "FORMAT", fileName: "doc.pdf" });
  });

  // File size is compared in bytes against MAX_IMAGE_SIZE_MB * 1024 * 1024,
  // so a file one MB over that threshold should trip the SIZE check even
  // though its format is valid.
  it("returns a SIZE error when a file exceeds the max size for its kind", () => {
    const oversized = buildFile("big.jpg", (MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024, "image/jpeg");
    expect(validateMediaFiles([oversized], 0, "image")).toEqual({
      code: "SIZE",
      fileName: "big.jpg",
    });
  });

  it("returns null when all image files are valid", () => {
    const files = [buildFile("img.jpg", 10, "image/jpeg")];
    expect(validateMediaFiles(files, 0, "image")).toBeNull();
  });

  // With kind "video", the function must switch to MAX_VIDEO_COUNT (not the
  // image count) for its limit check, so exceeding the smaller video count
  // by one file should still report COUNT.
  it("applies the video count/size limits when kind is video", () => {
    const files = Array.from({ length: MAX_VIDEO_COUNT + 1 }, (_, i) =>
      buildFile(`clip${i}.mp4`, 10, "video/mp4"),
    );
    expect(validateMediaFiles(files, 0, "video")).toEqual({ code: "COUNT" });
  });
});

// validateQuotationFiles: validates quotation attachment files (e.g. price
// quotes) with no count limit — only per-file format (isAllowedQuotationFile)
// and size (MAX_QUOTATION_SIZE_MB) checks, in that order. Returns the first
// FORMAT or SIZE error found (with fileName), or null if all files pass.
describe("validateQuotationFiles", () => {
  // An empty array has no files to fail either check, so the loop never
  // runs and the function should fall through to its null return.
  it("returns null for an empty file list", () => {
    expect(validateQuotationFiles([])).toBeNull();
  });

  it("returns a FORMAT error for a disallowed file", () => {
    const files = [buildFile("photo.jpg", 10, "image/jpeg")];
    expect(validateQuotationFiles(files)).toEqual({ code: "FORMAT", fileName: "photo.jpg" });
  });

  it("returns a SIZE error when the file exceeds the quotation max size", () => {
    const oversized = buildFile("quote.pdf", 11 * 1024 * 1024, "application/pdf");
    expect(validateQuotationFiles([oversized])).toEqual({ code: "SIZE", fileName: "quote.pdf" });
  });

  it("returns null for a valid quotation file", () => {
    const files = [buildFile("quote.pdf", 10, "application/pdf")];
    expect(validateQuotationFiles(files)).toBeNull();
  });
});
