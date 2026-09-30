import { describe, expect, it } from "vitest";
import {
  isAllowedImageFile,
  isAllowedQuotationFile,
  isAllowedVideoFile,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE_MB,
  MAX_QUOTATION_SIZE_MB,
  MAX_VIDEO_COUNT,
  MAX_VIDEO_SIZE_MB,
  validateMediaFiles,
  validateQuotationFiles,
} from "./media-validation";

function makeFile(name: string, type: string, sizeBytes = 100): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe("isAllowedImageFile", () => {
  it("allows a file with an image extension", () => {
    expect(isAllowedImageFile(makeFile("photo.png", ""))).toBe(true);
  });

  it("allows a file with an image MIME type but an unrecognized extension", () => {
    expect(isAllowedImageFile(makeFile("photo", "image/png"))).toBe(true);
  });

  it("rejects a non-image file", () => {
    expect(isAllowedImageFile(makeFile("doc.pdf", "application/pdf"))).toBe(false);
  });
});

describe("isAllowedVideoFile", () => {
  it("allows a file with a video extension", () => {
    expect(isAllowedVideoFile(makeFile("clip.mp4", ""))).toBe(true);
  });

  it("allows a file with a video MIME type but an unrecognized extension", () => {
    expect(isAllowedVideoFile(makeFile("clip", "video/mp4"))).toBe(true);
  });

  it("rejects a non-video file", () => {
    expect(isAllowedVideoFile(makeFile("doc.pdf", "application/pdf"))).toBe(false);
  });
});

describe("isAllowedQuotationFile", () => {
  it("allows a pdf by extension", () => {
    expect(isAllowedQuotationFile(makeFile("quote.pdf", ""))).toBe(true);
  });

  it("allows a docx by MIME type", () => {
    expect(
      isAllowedQuotationFile(
        makeFile(
          "quote",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      ),
    ).toBe(true);
  });

  it("rejects an image file", () => {
    expect(isAllowedQuotationFile(makeFile("photo.png", "image/png"))).toBe(false);
  });
});

describe("validateMediaFiles", () => {
  it("returns a COUNT error when adding the files would exceed the max image count", () => {
    const files = Array.from({ length: MAX_IMAGE_COUNT }, (_, i) => makeFile(`${i}.png`, "image/png"));
    expect(validateMediaFiles(files, 1, "image")).toEqual({ code: "COUNT" });
  });

  it("returns a COUNT error when adding the files would exceed the max video count", () => {
    const files = Array.from({ length: MAX_VIDEO_COUNT }, (_, i) => makeFile(`${i}.mp4`, "video/mp4"));
    expect(validateMediaFiles(files, 1, "video")).toEqual({ code: "COUNT" });
  });

  it("returns a FORMAT error naming the offending file for a disallowed image format", () => {
    const files = [makeFile("doc.pdf", "application/pdf")];
    expect(validateMediaFiles(files, 0, "image")).toEqual({ code: "FORMAT", fileName: "doc.pdf" });
  });

  it("returns a SIZE error naming the offending file when an image exceeds the max size", () => {
    const oversized = makeFile("big.png", "image/png", (MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024);
    expect(validateMediaFiles([oversized], 0, "image")).toEqual({ code: "SIZE", fileName: "big.png" });
  });

  it("returns a SIZE error naming the offending file when a video exceeds the max size", () => {
    const oversized = makeFile("big.mp4", "video/mp4", (MAX_VIDEO_SIZE_MB + 1) * 1024 * 1024);
    expect(validateMediaFiles([oversized], 0, "video")).toEqual({ code: "SIZE", fileName: "big.mp4" });
  });

  it("returns null when every image file is within limits", () => {
    expect(validateMediaFiles([makeFile("a.png", "image/png")], 0, "image")).toBeNull();
  });

  it("returns null for an empty files array", () => {
    expect(validateMediaFiles([], 0, "image")).toBeNull();
  });
});

describe("validateQuotationFiles", () => {
  it("returns a FORMAT error for a disallowed quotation format", () => {
    const files = [makeFile("photo.png", "image/png")];
    expect(validateQuotationFiles(files)).toEqual({ code: "FORMAT", fileName: "photo.png" });
  });

  it("returns a SIZE error when a quotation file exceeds the max size", () => {
    const oversized = makeFile("quote.pdf", "application/pdf", (MAX_QUOTATION_SIZE_MB + 1) * 1024 * 1024);
    expect(validateQuotationFiles([oversized])).toEqual({ code: "SIZE", fileName: "quote.pdf" });
  });

  it("returns null when the quotation file is valid", () => {
    expect(validateQuotationFiles([makeFile("quote.pdf", "application/pdf")])).toBeNull();
  });

  it("returns null for an empty files array", () => {
    expect(validateQuotationFiles([])).toBeNull();
  });
});
