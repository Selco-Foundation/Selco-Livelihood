import type { ActivityDocument } from "../types/facility-review";

export const REPORT_DOCUMENT_TYPES = [
  "INSTALLATION_REPORT",
  "INSTALLATION_REPORT_BOM",
  "INSTALLATION_COMPLETION_CERTIFICATE",
  "ASSET_HANDOVER_DOCUMENT",
] as const;

export const INSTALLATION_IMAGE_PREFIX = "INSTALLATION_IMAGE";

/**
 * Workflow document tagging convention — mirrors qc's own `documentType`
 * scheme (`getAssetAggregation`/`shouldLoadDocument` in useFacilityDetails.js):
 * `<KEY>-IMAGE-<suffix>` / `<KEY>-VIDEO-<suffix>` for asset/media galleries
 * (`<KEY>` is the asset section id for Solar, or `MACHINE` for Machine media
 * groups), `INSTALLATION_IMAGE-<code>` for the checklist, and a handful of
 * fixed whole-document types for the completion report. Not yet verified
 * against a real populated sample (none exists) — verify once real
 * `workflow[].documents` data is available and adjust if the real backend
 * differs.
 */
export interface ClassifiedDocument {
  document: ActivityDocument;
  key: string;
  kind: "IMAGE" | "VIDEO" | "OTHER";
  suffix?: string;
}

export function classifyDocument(document: ActivityDocument): ClassifiedDocument {
  const type = document.documentType?.toUpperCase() ?? "";

  if ((REPORT_DOCUMENT_TYPES as readonly string[]).includes(type)) {
    return { document, key: type, kind: "OTHER" };
  }

  if (type.startsWith(`${INSTALLATION_IMAGE_PREFIX}-`)) {
    return {
      document,
      key: INSTALLATION_IMAGE_PREFIX,
      kind: "IMAGE",
      suffix: type.slice(INSTALLATION_IMAGE_PREFIX.length + 1),
    };
  }

  const [key, kind, ...rest] = type.split("-");
  if (kind === "IMAGE" || kind === "VIDEO") {
    return { document, key, kind, suffix: rest.join("-") || undefined };
  }

  return { document, key: type, kind: "OTHER" };
}

export function groupDocumentsByKey(
  documents: ActivityDocument[] | null | undefined,
): Map<string, ClassifiedDocument[]> {
  const grouped = new Map<string, ClassifiedDocument[]>();
  for (const document of documents ?? []) {
    const classified = classifyDocument(document);
    const existing = grouped.get(classified.key) ?? [];
    grouped.set(classified.key, [...existing, classified]);
  }
  return grouped;
}
