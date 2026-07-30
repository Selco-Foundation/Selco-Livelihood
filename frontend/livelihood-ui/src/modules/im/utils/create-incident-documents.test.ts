import { describe, expect, it } from "vitest";
import { buildFile } from "@/test/mocks/file";
import type { UploadedMediaEntry } from "../types/create-incident";
import { buildUploadedDocuments } from "./create-incident-documents";

describe("buildUploadedDocuments", () => {
  it("returns an empty array for no uploads", () => {
    expect(buildUploadedDocuments([])).toEqual([]);
  });

  it("builds an image document using its own file, no HLS entry", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("photo.jpg", 100, "image/jpeg"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([
      { fileStoreId: "fs-1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
    ]);
  });

  it("builds a FIR document with a fixed documentType and empty documentUid", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("fir.pdf", 100, "application/pdf"), fileStoreId: "fs-1", kind: "fir" },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([
      { fileStoreId: "fs-1", documentUid: "", documentType: "FIR_DOCUMENT", additionalDetails: {} },
    ]);
  });

  it("uses the file's MIME type as documentType for other files with an image/video MIME", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("clip.gif", 100, "image/gif"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("image/gif");
  });

  it("falls back to the upper-cased extension when the file's MIME type isn't image/video", () => {
    const uploads: UploadedMediaEntry[] = [
      {
        file: buildFile(
          "quote.docx",
          100,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
        fileStoreId: "fs-1",
        kind: "image",
      },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("DOCX");
  });

  it("falls back to DOCUMENT when the extension segment is empty (name ends with a dot)", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("trailing.", 100, "application/octet-stream"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("DOCUMENT");
  });

  it("upper-cases a filename with no dot at all as its own 'extension'", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("noext", 100, "application/octet-stream"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("NOEXT");
  });

  it("builds both an HLS master entry and the raw video entry when masterFileStoreId is present", () => {
    const uploads: UploadedMediaEntry[] = [
      {
        file: buildFile("clip.mp4", 100, "video/mp4"),
        fileStoreId: "fs-video",
        masterFileStoreId: "fs-master",
        kind: "video",
      },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([
      { fileStoreId: "fs-master", documentUid: "video1", documentType: "HLS", additionalDetails: {} },
      { fileStoreId: "fs-video", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
    ]);
  });

  it("omits the HLS entry when masterFileStoreId is absent", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("clip.mp4", 100, "video/mp4"), fileStoreId: "fs-video", kind: "video" },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([
      { fileStoreId: "fs-video", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
    ]);
  });

  it("increments the video counter across multiple video uploads", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("clip1.mp4", 100, "video/mp4"), fileStoreId: "fs-1", kind: "video" },
      { file: buildFile("clip2.mp4", 100, "video/mp4"), fileStoreId: "fs-2", kind: "video" },
    ];
    const docs = buildUploadedDocuments(uploads);
    expect(docs.map((d) => d.documentUid)).toEqual(["video1", "video2"]);
  });

  it("dedupes documents by fileStoreId, keeping only the first occurrence", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("a.jpg", 100, "image/jpeg"), fileStoreId: "fs-dup", kind: "image" },
      { file: buildFile("b.jpg", 100, "image/jpeg"), fileStoreId: "fs-dup", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)).toHaveLength(1);
  });

  it("filters out documents with an empty/falsy fileStoreId", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("a.jpg", 100, "image/jpeg"), fileStoreId: "", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([]);
  });
});
