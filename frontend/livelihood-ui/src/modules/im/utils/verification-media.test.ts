import { describe, expect, it } from "vitest";
import type { FileStoreUrlResponse } from "@/shared";
import type { VerificationDocument } from "../types/create-incident";
import { getOriginalFileUrl, mapVerificationMedia } from "./verification-media";

describe("getOriginalFileUrl", () => {
  it("returns the url as-is when it has no comma-joined variants", () => {
    expect(getOriginalFileUrl("http://files/1.jpg")).toBe("http://files/1.jpg");
  });

  it("picks the variant without large/medium/small in its path", () => {
    const url =
      "http://files/large/1.jpg,http://files/1.jpg,http://files/medium/1.jpg,http://files/small/1.jpg";
    expect(getOriginalFileUrl(url)).toBe("http://files/1.jpg");
  });

  it("falls back to the first part when every variant contains large/medium/small", () => {
    const url = "http://files/large/1.jpg,http://files/medium/1.jpg";
    expect(getOriginalFileUrl(url)).toBe("http://files/large/1.jpg");
  });
});

describe("mapVerificationMedia", () => {
  function urlResponse(entries: Array<{ id: string; url: string }>): FileStoreUrlResponse {
    return { fileStoreIds: entries };
  }

  it("sorts a plain image document into images", () => {
    const documents: VerificationDocument[] = [
      { fileStoreId: "fs-1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
    ];
    const response = urlResponse([{ id: "fs-1", url: "http://files/1.jpg" }]);

    expect(mapVerificationMedia(documents, response).images).toEqual(["http://files/1.jpg"]);
  });

  it("pairs an HLS document with its matching video document by documentUid", () => {
    const documents: VerificationDocument[] = [
      { fileStoreId: "fs-2", documentUid: "video1", documentType: "HLS", additionalDetails: {} },
      { fileStoreId: "fs-3", documentUid: "video1", documentType: "video/mp4", additionalDetails: {} },
    ];
    const response = urlResponse([
      { id: "fs-2", url: "http://files/1.m3u8" },
      { id: "fs-3", url: "http://files/1.mp4" },
    ]);

    expect(mapVerificationMedia(documents, response).videos).toEqual([
      { master: "http://files/1.m3u8", original: "http://files/1.mp4" },
    ]);
  });

  it("uses fileStoreId as the video grouping key when documentUid is empty", () => {
    const documents: VerificationDocument[] = [
      { fileStoreId: "fs-lone", documentUid: "", documentType: "video/mp4", additionalDetails: {} },
    ];
    const response = urlResponse([{ id: "fs-lone", url: "http://files/lone.mp4" }]);

    expect(mapVerificationMedia(documents, response).videos).toEqual([
      { master: null, original: "http://files/lone.mp4" },
    ]);
  });

  it("skips a document whose fileStoreId has no matching entry in the response", () => {
    const documents: VerificationDocument[] = [
      { fileStoreId: "missing", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
    ];
    expect(mapVerificationMedia(documents, urlResponse([])).images).toEqual([]);
  });

  it("resolves each url through getOriginalFileUrl before classifying", () => {
    const documents: VerificationDocument[] = [
      { fileStoreId: "fs-1", documentUid: "", documentType: "image/jpeg", additionalDetails: {} },
    ];
    const response = urlResponse([
      { id: "fs-1", url: "http://files/large/1.jpg,http://files/1.jpg,http://files/small/1.jpg" },
    ]);

    expect(mapVerificationMedia(documents, response).images).toEqual(["http://files/1.jpg"]);
  });

  it("derives thumbs from every response entry regardless of whether a document references it", () => {
    const response = urlResponse([
      { id: "fs-1", url: "http://files/1.jpg" },
      { id: "fs-unreferenced", url: "http://files/2.jpg" },
    ]);

    expect(mapVerificationMedia([], response).thumbs).toEqual([
      "http://files/1.jpg",
      "http://files/2.jpg",
    ]);
  });

  it("resolves a comma-joined thumbnail entry to its fourth (small) variant", () => {
    const response = urlResponse([
      {
        id: "fs-1",
        url: "http://files/original.jpg,http://files/large/1.jpg,http://files/medium/1.jpg,http://files/small/1.jpg",
      },
    ]);

    expect(mapVerificationMedia([], response).thumbs).toEqual(["http://files/small/1.jpg"]);
  });

  it("returns empty thumbs/images/videos for no documents and no response entries", () => {
    expect(mapVerificationMedia([], urlResponse([]))).toEqual({ thumbs: [], images: [], videos: [] });
  });
});
