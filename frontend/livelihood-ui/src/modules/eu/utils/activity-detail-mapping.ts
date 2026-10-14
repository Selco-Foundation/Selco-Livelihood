import type { ActivityFacilityRow, ActivityWorkflowEntry } from "../services/activity-detail";
import type { AssetSearchResponseItem } from "../services/asset";
import type {
  ActivityInfo,
  AssetItem,
  AssetSection,
  AuditCheckpoint,
  LabeledValue,
  RawDocumentRef,
  ReportSection,
  ResolvedReportSection,
} from "../types/activity-detail";

/** Per-asset-item photo documents are tagged with this prefix — verified
 * against a real asset-registry response by the facility asset tab's own
 * filter/spec lookup. */
const ASSET_PHOTO_DOCUMENT_TYPE_PREFIX = "ASSET_PHOTO";

/** The completion-report's whole-document types — the best-available
 * convention agreed on by every implementation of this report seen so far,
 * though not yet checked against a real populated sample. */
const REPORT_DOCUMENT_TYPES = {
  supportingReport: "INSTALLATION_REPORT",
  completionCertificate: "INSTALLATION_COMPLETION_CERTIFICATE",
  assetHandoverDocument: "ASSET_HANDOVER_DOCUMENT",
} as const;

function formatEpochDate(epochMs: number): string {
  const date = new Date(epochMs);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

export function buildActivityInfo(row: ActivityFacilityRow): ActivityInfo {
  const activityFacility = row.activityFacility;
  return {
    facilityName: activityFacility?.facility?.facility_name,
    activityType: activityFacility?.activityType,
    projectCode: activityFacility?.fieldPlan?.project?.name,
    fieldPlanCode: activityFacility?.fieldPlan?.name,
  };
}

/** The workflow list already comes back newest-first, so the timeline renders in that same order without re-sorting. */
export function buildAuditTrail(workflow: ActivityWorkflowEntry[] | undefined): AuditCheckpoint[] {
  return (workflow ?? []).map((entry, index) => ({
    id: entry.id ?? `checkpoint-${index}`,
    status: entry.state?.applicationStatus ?? "-",
    date: entry.auditDetails?.createdTime ? formatEpochDate(entry.auditDetails.createdTime) : "-",
    actorName: entry.assigner?.name,
    comment: entry.comment,
  }));
}

function toDocumentRef(document: { documentType?: string; fileStore?: string }): RawDocumentRef | undefined {
  return document.fileStore ? { fileStoreId: document.fileStore, documentType: document.documentType } : undefined;
}

/**
 * One section per asset type actually present (no fixed Panel/Battery/Inverter
 * slots) — an asset type with zero rows simply produces no section, and any
 * asset type the backend returns renders, not just a hardcoded solar set.
 */
export function buildAssetSections(
  assets: AssetSearchResponseItem[],
  assetTypeNames: Map<string, string>,
): AssetSection[] {
  const grouped = new Map<string, AssetSearchResponseItem[]>();
  for (const asset of assets) {
    const assetType = asset.assetTypeID;
    if (!assetType) continue;
    grouped.set(assetType, [...(grouped.get(assetType) ?? []), asset]);
  }

  return Array.from(grouped.entries()).map(([assetType, rows]) => {
    const first = rows[0];
    const label = assetTypeNames.get(assetType) ?? assetType;

    const specifications: LabeledValue[] = [
      { label: "System", value: first.system || "-" },
      { label: "Capacity", value: first.assetDetails?.capacity || "-" },
    ];

    const details: LabeledValue[] = [
      { label: "Count", value: String(rows.length) },
      {
        label: "Warranty Start Date",
        value: first.warrantyStartDate ? formatEpochDate(new Date(first.warrantyStartDate).getTime()) : "-",
      },
      { label: "Warranty Duration", value: first.warrantyDuration ? `${first.warrantyDuration} Years` : "-" },
      { label: "Brand", value: first.brandID || "-" },
    ];

    const items: AssetItem[] = rows.map((asset, index) => ({
      itemNumber: index + 1,
      serialNumber: asset.serialNumber || "-",
      capacity: asset.assetDetails?.capacity || "-",
      images: [],
    }));

    const photoDocuments: RawDocumentRef[][] = rows.map((asset) =>
      (asset.documents ?? [])
        .filter((document) => document.documentType?.toUpperCase().startsWith(ASSET_PHOTO_DOCUMENT_TYPE_PREFIX))
        .map(toDocumentRef)
        .filter((ref): ref is RawDocumentRef => Boolean(ref)),
    );

    return { id: assetType, label, count: rows.length, specifications, details, items, photoDocuments };
  });
}

export function buildReportSection(latestWorkflowDocuments: ActivityWorkflowEntry["documents"]): ReportSection {
  const documents = (latestWorkflowDocuments ?? [])
    .map((document) => toDocumentRef({ documentType: document.documentType, fileStore: document.fileStoreId }))
    .filter((ref): ref is RawDocumentRef => Boolean(ref))
    .filter((ref) => (Object.values(REPORT_DOCUMENT_TYPES) as string[]).includes(ref.documentType?.toUpperCase() ?? ""));

  return { documents };
}

/** Resolves one asset section's item photos once its file-store ids have been turned into URLs — kept separate from `buildAssetSections` since resolution only happens lazily, on expand. */
export function resolveAssetItemImages(items: AssetItem[], photoDocuments: RawDocumentRef[][], urlByFileStoreId: Map<string, string>): AssetItem[] {
  return items.map((item, index) => ({
    ...item,
    images: (photoDocuments[index] ?? [])
      .map((ref) => urlByFileStoreId.get(ref.fileStoreId))
      .filter((url): url is string => Boolean(url))
      .map((url) => ({ url })),
  }));
}

export function resolveReportSection(
  section: ReportSection,
  urlByFileStoreId: Map<string, string>,
  facilityName: string,
): ResolvedReportSection {
  function findDocument(type: string) {
    const match = section.documents.find((document) => document.documentType?.toUpperCase() === type);
    const url = match ? urlByFileStoreId.get(match.fileStoreId) : undefined;
    return url ? { name: `${facilityName}.pdf`, url } : null;
  }

  const supportingDocuments = section.documents
    .filter((document) => document.documentType?.toUpperCase() === REPORT_DOCUMENT_TYPES.supportingReport)
    .map((document) => urlByFileStoreId.get(document.fileStoreId))
    .filter((url): url is string => Boolean(url))
    .map((url) => ({ name: `${facilityName}.pdf`, url }));

  return {
    installationCompletionCertificate: findDocument(REPORT_DOCUMENT_TYPES.completionCertificate),
    assetHandoverDocument: findDocument(REPORT_DOCUMENT_TYPES.assetHandoverDocument),
    supportingDocuments,
  };
}

export { REPORT_DOCUMENT_TYPES };
