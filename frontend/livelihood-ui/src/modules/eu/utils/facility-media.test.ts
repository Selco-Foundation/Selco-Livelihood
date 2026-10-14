import { describe, expect, it } from "vitest";
import type { FileStoreUrlResponse } from "@/shared";
import { buildAssetSectionMedia, buildImageChecklistMedia, buildReportSectionMedia } from "./facility-media";

function urlResponse(entries: Array<{ id: string; url: string }>): FileStoreUrlResponse {
  return { fileStoreIds: entries };
}

describe("buildAssetSectionMedia", () => {
  it("collects images and videos into the flat arrays when no media groups are requested", () => {
    const documents = [
      { documentType: "PANEL-IMAGE-FRONT", fileStoreId: "fs-1" },
      { documentType: "PANEL-VIDEO-INSTALL", fileStoreId: "fs-2" },
    ];
    const response = urlResponse([
      { id: "fs-1", url: "http://files/1.jpg" },
      { id: "fs-2", url: "http://files/2.mp4" },
    ]);

    expect(buildAssetSectionMedia(documents, response)).toEqual({
      images: [{ url: "http://files/1.jpg" }],
      videos: [{ url: "http://files/2.mp4", size: undefined }],
      mediaGroups: undefined,
    });
  });

  it("routes documents with a matching suffix into their named media group", () => {
    const documents = [
      { documentType: "MACHINE-IMAGE-MACHINE_ELECTRIC_BOARD", fileStoreId: "fs-1" },
      { documentType: "MACHINE-VIDEO-MACHINE_DEMO_VIDEO", fileStoreId: "fs-2" },
    ];
    const response = urlResponse([
      { id: "fs-1", url: "http://files/board.jpg" },
      { id: "fs-2", url: "http://files/demo.mp4" },
    ]);

    const result = buildAssetSectionMedia(documents, response, [
      "MACHINE_ELECTRIC_BOARD",
      "MACHINE_DEMO_VIDEO",
    ]);

    expect(result.images).toEqual([]);
    expect(result.videos).toEqual([]);
    expect(result.mediaGroups).toEqual({
      MACHINE_ELECTRIC_BOARD: { images: [{ url: "http://files/board.jpg" }], videos: [] },
      MACHINE_DEMO_VIDEO: { images: [], videos: [{ url: "http://files/demo.mp4" }] },
    });
  });

  it("initializes every requested media group even when no document matches it", () => {
    const result = buildAssetSectionMedia([], urlResponse([]), ["MACHINE_CIVIL_WORK"]);
    expect(result.mediaGroups).toEqual({ MACHINE_CIVIL_WORK: { images: [], videos: [] } });
  });

  it("falls back to the flat arrays when a document's suffix has no matching group", () => {
    const documents = [{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "fs-1" }];
    const response = urlResponse([{ id: "fs-1", url: "http://files/1.jpg" }]);

    const result = buildAssetSectionMedia(documents, response, ["MACHINE_CIVIL_WORK"]);
    expect(result.images).toEqual([{ url: "http://files/1.jpg" }]);
  });

  it("skips a document whose fileStoreId has no resolvable url", () => {
    const documents = [{ documentType: "PANEL-IMAGE-FRONT", fileStoreId: "missing-fs" }];
    expect(buildAssetSectionMedia(documents, urlResponse([]))).toEqual({
      images: [],
      videos: [],
      mediaGroups: undefined,
    });
  });

  it("skips report-type (OTHER-kind) documents", () => {
    const documents = [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs-1" }];
    const response = urlResponse([{ id: "fs-1", url: "http://files/report.pdf" }]);
    expect(buildAssetSectionMedia(documents, response)).toEqual({
      images: [],
      videos: [],
      mediaGroups: undefined,
    });
  });
});

describe("buildReportSectionMedia", () => {
  it("resolves the completion report document by its exact type", () => {
    const documents = [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "fs-1" }];
    const response = urlResponse([{ id: "fs-1", url: "http://files/report.pdf" }]);

    expect(buildReportSectionMedia(documents, response, "Facility A")).toEqual({
      report: { name: "Facility A.pdf", url: "http://files/report.pdf" },
      supportingDocuments: [],
    });
  });

  it("returns a null report when no matching document exists", () => {
    expect(buildReportSectionMedia([], urlResponse([]), "Facility A").report).toBeNull();
  });

  it("returns a null report when the matching document has no resolvable url", () => {
    const documents = [{ documentType: "INSTALLATION_REPORT_BOM", fileStoreId: "missing" }];
    expect(buildReportSectionMedia(documents, urlResponse([]), "Facility A").report).toBeNull();
  });

  it("collects INSTALLATION_REPORT documents as supporting documents", () => {
    const documents = [
      { documentType: "INSTALLATION_REPORT", fileStoreId: "fs-1" },
      { documentType: "INSTALLATION_REPORT", fileStoreId: "fs-2" },
    ];
    const response = urlResponse([
      { id: "fs-1", url: "http://files/a.pdf" },
      { id: "fs-2", url: "http://files/b.pdf" },
    ]);

    expect(buildReportSectionMedia(documents, response, "Facility A").supportingDocuments).toEqual([
      { name: "Facility A.pdf", url: "http://files/a.pdf" },
      { name: "Facility A.pdf", url: "http://files/b.pdf" },
    ]);
  });

  it("excludes an INSTALLATION_REPORT document with no resolvable url from supporting documents", () => {
    const documents = [{ documentType: "INSTALLATION_REPORT", fileStoreId: "missing" }];
    expect(buildReportSectionMedia(documents, urlResponse([]), "Facility A").supportingDocuments).toEqual(
      [],
    );
  });
});

describe("buildImageChecklistMedia", () => {
  it("resolves every document with a matching url into the images array", () => {
    const documents = [
      { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "fs-1" },
      { documentType: "INSTALLATION_IMAGE-NAMEPLATE", fileStoreId: "fs-2" },
    ];
    const response = urlResponse([
      { id: "fs-1", url: "http://files/1.jpg" },
      { id: "fs-2", url: "http://files/2.jpg" },
    ]);

    expect(buildImageChecklistMedia(documents, response)).toEqual({
      images: [{ url: "http://files/1.jpg" }, { url: "http://files/2.jpg" }],
    });
  });

  it("skips documents with no resolvable url", () => {
    const documents = [{ documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW", fileStoreId: "missing" }];
    expect(buildImageChecklistMedia(documents, urlResponse([]))).toEqual({ images: [] });
  });
});
