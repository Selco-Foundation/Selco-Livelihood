import { describe, expect, it } from "vitest";
import type { UploadedMediaEntry } from "../types/create-incident";
import { buildUploadedDocuments } from "./create-incident-documents";

function imageUpload(fileStoreId: string, name = "photo.jpg"): UploadedMediaEntry {
  return {
    file: new File(["content"], name, { type: "image/jpeg" }),
    fileStoreId,
    kind: "image",
  };
}

describe("buildUploadedDocuments", () => {
  it("maps an image upload using its file's MIME type as documentType", () => {
    const result = buildUploadedDocuments([imageUpload("fs-1")]);
    expect(result).toEqual([
      { fileStoreId: "fs-1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
    ]);
  });

  it("maps a video upload with a master file into an HLS document plus the video document", () => {
    const upload: UploadedMediaEntry = {
      file: new File(["content"], "clip.mp4", { type: "video/mp4" }),
      fileStoreId: "fs-video",
      masterFileStoreId: "fs-master",
      kind: "video",
    };

    const result = buildUploadedDocuments([upload]);

    expect(result).toEqual([
      { fileStoreId: "fs-master", documentUid: "video1", documentType: "HLS", additionalDetails: {} },
      { fileStoreId: "fs-video", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
    ]);
  });

  it("omits the HLS document when a video upload has no master file", () => {
    const upload: UploadedMediaEntry = {
      file: new File(["content"], "clip.mp4", { type: "video/mp4" }),
      fileStoreId: "fs-video",
      kind: "video",
    };

    const result = buildUploadedDocuments([upload]);

    expect(result).toEqual([
      { fileStoreId: "fs-video", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
    ]);
  });

  it("numbers multiple video uploads sequentially", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: new File(["a"], "a.mp4", { type: "video/mp4" }), fileStoreId: "fs-1", kind: "video" },
      { file: new File(["b"], "b.mp4", { type: "video/mp4" }), fileStoreId: "fs-2", kind: "video" },
    ];

    const result = buildUploadedDocuments(uploads);

    expect(result.map((doc) => doc.documentUid)).toEqual(["video1", "video2"]);
  });

  it("maps a fir upload to a FIR_DOCUMENT type", () => {
    const upload: UploadedMediaEntry = {
      file: new File(["content"], "fir.pdf", { type: "application/pdf" }),
      fileStoreId: "fs-fir",
      kind: "fir",
    };

    expect(buildUploadedDocuments([upload])).toEqual([
      { fileStoreId: "fs-fir", documentUid: "", documentType: "FIR_DOCUMENT", additionalDetails: {} },
    ]);
  });

  it("uses the uppercased file extension as documentType for a non-media, non-fir file", () => {
    const upload: UploadedMediaEntry = {
      file: new File(["content"], "quote.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      fileStoreId: "fs-doc",
      kind: "image",
    };

    expect(buildUploadedDocuments([upload])).toEqual([
      { fileStoreId: "fs-doc", documentUid: "", documentType: "DOCX", additionalDetails: {} },
    ]);
  });

  it("falls back to DOCUMENT when a non-media file's name has no extension segment", () => {
    const upload: UploadedMediaEntry = {
      file: new File(["content"], "", { type: "application/octet-stream" }),
      fileStoreId: "fs-doc",
      kind: "image",
    };

    expect(buildUploadedDocuments([upload])).toEqual([
      { fileStoreId: "fs-doc", documentUid: "", documentType: "DOCUMENT", additionalDetails: {} },
    ]);
  });

  it("dedupes documents sharing the same fileStoreId, keeping the first occurrence", () => {
    const result = buildUploadedDocuments([imageUpload("fs-1"), imageUpload("fs-1", "duplicate.jpg")]);
    expect(result).toHaveLength(1);
  });

  it("drops documents with an empty fileStoreId", () => {
    const result = buildUploadedDocuments([imageUpload("")]);
    expect(result).toEqual([]);
  });

  it("returns an empty array for no uploads", () => {
    expect(buildUploadedDocuments([])).toEqual([]);
  });
});
