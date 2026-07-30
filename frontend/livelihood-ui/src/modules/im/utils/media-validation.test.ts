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

describe("validateMediaFiles", () => {
  it("returns a COUNT error when the total exceeds the image max", () => {
    const files = Array.from({ length: MAX_IMAGE_COUNT + 1 }, (_, i) =>
      buildFile(`img${i}.jpg`, 10, "image/jpeg"),
    );
    expect(validateMediaFiles(files, 0, "image")).toEqual({ code: "COUNT" });
  });

  it("counts existing files toward the max", () => {
    const files = [buildFile("img.jpg", 10, "image/jpeg")];
    expect(validateMediaFiles(files, MAX_IMAGE_COUNT, "image")).toEqual({ code: "COUNT" });
  });

  it("returns a FORMAT error for a disallowed file", () => {
    const files = [buildFile("doc.pdf", 10, "application/pdf")];
    expect(validateMediaFiles(files, 0, "image")).toEqual({ code: "FORMAT", fileName: "doc.pdf" });
  });

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

  it("applies the video count/size limits when kind is video", () => {
    const files = Array.from({ length: MAX_VIDEO_COUNT + 1 }, (_, i) =>
      buildFile(`clip${i}.mp4`, 10, "video/mp4"),
    );
    expect(validateMediaFiles(files, 0, "video")).toEqual({ code: "COUNT" });
  });
});

describe("validateQuotationFiles", () => {
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
