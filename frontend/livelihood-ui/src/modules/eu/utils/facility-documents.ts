import type { ActivityDocument } from "@/ui";

// Mirrors ir's utils/facility-documents.ts exactly — both modules classify
// the same workflow documents the same way for the same activity.

// Installation Completion Certificate / Asset Handover Document were
// dropped — verified against real workflow documents across every
// submitted facility that INSTALLATION_REPORT_BOM is the only report-type
// document actually used.
export const REPORT_DOCUMENT_TYPES = ["INSTALLATION_REPORT", "INSTALLATION_REPORT_BOM"] as const;

export const INSTALLATION_IMAGE_PREFIX = "INSTALLATION_IMAGE";

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
