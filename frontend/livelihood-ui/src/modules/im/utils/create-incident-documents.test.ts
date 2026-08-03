/**
 * Unit tests for `buildUploadedDocuments` (create-incident-documents.ts).
 *
 * This is a pure function with no side effects (no network, no DOM, no i18n), so the
 * tests need no providers, wrappers, or mocking beyond `buildFile`, a small test helper
 * that constructs a `File` with a given name/size/MIME type without touching the real
 * File/Blob internals. Each test builds a minimal `UploadedMediaEntry[]` input and
 * asserts on the shape of the `VerificationDocument[]` output, covering the three
 * upload "kind" branches (image/other, fir, video), the documentType fallback rules,
 * the video-counter/HLS-master pairing, and the final fileStoreId dedupe/prune pass.
 */
import { describe, expect, it } from "vitest";
import { buildFile } from "@/test/mocks/file";
import type { UploadedMediaEntry } from "../types/create-incident";
import { buildUploadedDocuments } from "./create-incident-documents";

// Converts the media/documents attached to an incident during creation into the
// `VerificationDocument[]` shape the backend expects. Handles three upload kinds:
//  - "video": pushes an optional HLS master entry (when masterFileStoreId is set) plus
//    the raw video entry, both sharing a shared "videoN" documentUid so the backend can
//    correlate them; N increments per video across the whole uploads array.
//  - "fir": always documentType "FIR_DOCUMENT" with an empty documentUid, regardless of
//    the underlying file's MIME type.
//  - anything else: documentType is the file's MIME type when it's image/* or video/*,
//    otherwise the (64-char-limit-safe) upper-cased file extension, or "DOCUMENT" if
//    there's no extension segment to use.
// Finally, the whole list is de-duplicated by fileStoreId (keeping the first occurrence)
// and any entry with a falsy fileStoreId is dropped.
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

  // Even though this upload's `kind` is "image", the documentType is driven by the
  // file's actual MIME type prefix, not the upload kind field.
  it("uses the file's MIME type as documentType for other files with an image/video MIME", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("clip.gif", 100, "image/gif"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("image/gif");
  });

  // A .docx MIME type is 71 chars, over the backend's 64-char documentType limit, so
  // non-image/video files use their upper-cased extension instead of the raw MIME type.
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

  // `"trailing.".split(".").pop()` yields `""`, a falsy extension, so getDocumentType's
  // ternary must fall back to the "DOCUMENT" default rather than returning an empty string.
  it("falls back to DOCUMENT when the extension segment is empty (name ends with a dot)", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("trailing.", 100, "application/octet-stream"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("DOCUMENT");
  });

  // With no "." in the name, `split(".").pop()` returns the whole filename, so it is
  // treated as (and upper-cased into) the "extension" rather than falling back to DOCUMENT.
  it("upper-cases a filename with no dot at all as its own 'extension'", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("noext", 100, "application/octet-stream"), fileStoreId: "fs-1", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)[0].documentType).toBe("NOEXT");
  });

  // When a masterFileStoreId is present (an HLS-transcoded master exists), two entries
  // are emitted for one upload: the HLS master first, then the raw video, both sharing
  // the same "video1" documentUid so the backend can associate them as one asset.
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

  // The video counter is scoped to the whole `uploads` array, not per-entry, so uid
  // numbering must keep incrementing ("video1", "video2", ...) across separate video uploads.
  it("increments the video counter across multiple video uploads", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("clip1.mp4", 100, "video/mp4"), fileStoreId: "fs-1", kind: "video" },
      { file: buildFile("clip2.mp4", 100, "video/mp4"), fileStoreId: "fs-2", kind: "video" },
    ];
    const docs = buildUploadedDocuments(uploads);
    expect(docs.map((d) => d.documentUid)).toEqual(["video1", "video2"]);
  });

  // The final filter pass tracks seen fileStoreIds in a Set and drops later duplicates,
  // so two distinct uploads sharing the same fileStoreId must collapse to one document.
  it("dedupes documents by fileStoreId, keeping only the first occurrence", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("a.jpg", 100, "image/jpeg"), fileStoreId: "fs-dup", kind: "image" },
      { file: buildFile("b.jpg", 100, "image/jpeg"), fileStoreId: "fs-dup", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)).toHaveLength(1);
  });

  // The dedupe filter's `!doc.fileStoreId` check also prunes entries with no fileStoreId
  // at all (e.g. an upload still in-flight), not just duplicates, so nothing gets sent
  // to the backend without a real file reference.
  it("filters out documents with an empty/falsy fileStoreId", () => {
    const uploads: UploadedMediaEntry[] = [
      { file: buildFile("a.jpg", 100, "image/jpeg"), fileStoreId: "", kind: "image" },
    ];
    expect(buildUploadedDocuments(uploads)).toEqual([]);
  });
});
