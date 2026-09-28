import { describe, expect, it } from "vitest";
import {
  classifyDocument,
  groupDocumentsByKey,
  INSTALLATION_IMAGE_PREFIX,
  REPORT_DOCUMENT_TYPES,
} from "./facility-documents";

describe("REPORT_DOCUMENT_TYPES", () => {
  it("contains exactly the two real report document types", () => {
    expect(REPORT_DOCUMENT_TYPES).toEqual(["INSTALLATION_REPORT", "INSTALLATION_REPORT_BOM"]);
  });
});

describe("INSTALLATION_IMAGE_PREFIX", () => {
  it("is the exact checklist document type prefix", () => {
    expect(INSTALLATION_IMAGE_PREFIX).toBe("INSTALLATION_IMAGE");
  });
});

describe("classifyDocument", () => {
  it("classifies a report document type as OTHER, keyed by the type itself", () => {
    expect(classifyDocument({ documentType: "INSTALLATION_REPORT_BOM" })).toEqual({
      document: { documentType: "INSTALLATION_REPORT_BOM" },
      key: "INSTALLATION_REPORT_BOM",
      kind: "OTHER",
    });
  });

  it("classifies an installation-image checklist document, extracting the suffix code", () => {
    const document = { documentType: "INSTALLATION_IMAGE-SITE_OVERVIEW" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "INSTALLATION_IMAGE",
      kind: "IMAGE",
      suffix: "SITE_OVERVIEW",
    });
  });

  it("classifies a generic KEY-IMAGE-suffix document type", () => {
    const document = { documentType: "PANEL-IMAGE-FRONT" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "PANEL",
      kind: "IMAGE",
      suffix: "FRONT",
    });
  });

  it("classifies a generic KEY-VIDEO-suffix document type", () => {
    const document = { documentType: "MACHINE-VIDEO-DEMO" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "MACHINE",
      kind: "VIDEO",
      suffix: "DEMO",
    });
  });

  it("leaves suffix undefined when a KEY-IMAGE type has no trailing suffix segment", () => {
    const document = { documentType: "PANEL-IMAGE" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "PANEL",
      kind: "IMAGE",
      suffix: undefined,
    });
  });

  it("falls back to OTHER, keyed by the whole type, for an unrecognized shape", () => {
    const document = { documentType: "SOME_RANDOM_TYPE" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "SOME_RANDOM_TYPE",
      kind: "OTHER",
    });
  });

  it("uppercases documentType before classifying", () => {
    const document = { documentType: "installation_image-earthing" };
    expect(classifyDocument(document)).toEqual({
      document,
      key: "INSTALLATION_IMAGE",
      kind: "IMAGE",
      suffix: "EARTHING",
    });
  });

  it("treats a missing documentType as an empty string, classified OTHER", () => {
    const document = {};
    expect(classifyDocument(document)).toEqual({
      document,
      key: "",
      kind: "OTHER",
    });
  });
});

describe("groupDocumentsByKey", () => {
  it("groups classified documents by their resolved key", () => {
    const documents = [
      { documentType: "PANEL-IMAGE-FRONT" },
      { documentType: "PANEL-IMAGE-BACK" },
      { documentType: "BATTERY-IMAGE-FRONT" },
    ];
    const grouped = groupDocumentsByKey(documents);
    expect(grouped.get("PANEL")).toHaveLength(2);
    expect(grouped.get("BATTERY")).toHaveLength(1);
  });

  it("returns an empty map for null documents", () => {
    expect(groupDocumentsByKey(null).size).toBe(0);
  });

  it("returns an empty map for undefined documents", () => {
    expect(groupDocumentsByKey(undefined).size).toBe(0);
  });
});
