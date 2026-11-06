import type { ActivityStatus } from "./activity-status";
import type { InstallationImageCriterion } from "./installation-image-mapping";
import type { RejectionReasonOption } from "./rejection-reason-mapping";
import type {
  ActivityAuditCheckpoint,
  ActivityDocument,
  AssetSectionContent,
  AuditSectionReasons,
  ImageChecklistSectionContent,
  LabeledValue,
  ReportSectionContent,
  ReviewSectionContent,
} from "@/ui";
import { REVIEW_SECTION_LABELS } from "./review-sections";
import type { MachineAssetData } from "./asset-mapping";
import { formatEpochDate } from "./date-format";
import { classifyDocument, INSTALLATION_IMAGE_PREFIX, REPORT_DOCUMENT_TYPES } from "./facility-documents";

// Shared by `ir` (reviewer, via activity-review-mapping.ts's
// buildActivityReviewDetail) and `eu` (end user, via
// activity-detail-mapping.ts's buildActivityDetail) — both assemble the same
// review sections, section-document buckets, and audit trail for the same
// FACILITY_INSTALLATION activity; only how they wrap the result (ir's
// ReviewActivity + workflowDocuments vs eu's info card fields + facilityName)
// differs, so that orchestration stays in each module's own mapping file.

export interface ActivityBomComponent {
  slNo?: number;
  product?: string;
  capacity?: string;
  category?: string;
  quantity?: number;
}

export interface ActivityBillOfMaterial {
  name?: string;
  reportNumber?: string;
  additionalDetails?: { vendorOrgName?: string; vendorUserName?: string };
  data?: { components?: ActivityBomComponent[]; purchaseOrderNumber?: string };
}

export interface ActivityWorkflowEntry {
  id?: string;
  action?: string;
  comment?: string;
  documents?: ActivityDocument[] | null;
  state?: { applicationStatus?: ActivityStatus };
  assigner?: { name?: string; roles?: Array<{ name?: string }> };
  auditDetails?: { createdTime?: number };
}

export interface ActivityTransactionComment {
  commentMessage?: string;
  assetType?: string;
}

export interface ActivityTransaction {
  processInstanceId?: string;
  comments?: ActivityTransactionComment[];
}

export function humanize(id: string): string {
  return id
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toAssetItems(components: ActivityBomComponent[]) {
  return components.map((component, index) => ({
    itemNumber: component.slNo ?? index + 1,
    label: component.product,
    capacity: component.capacity,
    quantity: component.quantity,
    images: [],
  }));
}

export function buildMachineSection(
  bom: ActivityBillOfMaterial | undefined,
  machineAssetData: MachineAssetData,
): AssetSectionContent {
  const { labelKey, label } = REVIEW_SECTION_LABELS.MACHINE;
  const specifications: LabeledValue[] = [];

  if (bom?.additionalDetails?.vendorOrgName) {
    specifications.push({
      labelKey: "ES_IR_MACHINE_VENDOR_ORG",
      label: "Vendor",
      value: bom.additionalDetails.vendorOrgName,
    });
  }
  if (bom?.additionalDetails?.vendorUserName) {
    specifications.push({
      labelKey: "ES_IR_MACHINE_INSTALLED_BY",
      label: "Installed By",
      value: bom.additionalDetails.vendorUserName,
    });
  }
  if (bom?.reportNumber) {
    specifications.push({
      labelKey: "ES_IR_MACHINE_REPORT_NUMBER",
      label: "Report Number",
      value: bom.reportNumber,
    });
  }

  // Real registered assets (PO/invoice/warranty/serial number, per-item
  // photos) once the facility's been submitted; falls back to the planned
  // BOM components (no serial/PO/warranty yet, since nothing's registered)
  // beforehand — same before/after-submission story as Solar's sections.
  const items =
    machineAssetData.items.length > 0
      ? machineAssetData.items
      : toAssetItems(bom?.data?.components ?? []);

  return {
    kind: "ASSET",
    id: "MACHINE",
    labelKey,
    label,
    specifications,
    // This block is about the *installation* (vendor/installed-by/report
    // number), not the machine itself — say so, so it doesn't read like a
    // machine spec sheet alongside the real machine Details below.
    specificationsHeading: {
      labelKey: "ES_IR_MACHINE_INSTALLATION_DETAILS",
      label: "Installation Details",
    },
    details: machineAssetData.details,
    items,
    images: [],
    videos: [],
    mediaGroups: machineAssetData.mediaGroups,
  };
}

export function buildReportSection(bom: ActivityBillOfMaterial | undefined): ReportSectionContent {
  const { labelKey, label } = REVIEW_SECTION_LABELS.INSTALLATION_COMPLETION_REPORT;
  const specifications: LabeledValue[] = [];

  if (bom?.data?.purchaseOrderNumber) {
    specifications.push({
      labelKey: "ES_IR_PURCHASE_ORDER_NUMBER",
      label: "Purchase Order Number",
      value: bom.data.purchaseOrderNumber,
    });
  }

  return {
    kind: "REPORT",
    id: "INSTALLATION_COMPLETION_REPORT",
    labelKey,
    label,
    specifications,
    report: null,
    supportingDocuments: [],
  };
}

export function buildImageChecklistSections(
  criteria: InstallationImageCriterion[],
): ImageChecklistSectionContent[] {
  return criteria.map((criterion) => ({
    kind: "IMAGE_CHECKLIST",
    id: `${INSTALLATION_IMAGE_PREFIX}_${criterion.code}`,
    label: criterion.description,
    images: [],
  }));
}

/**
 * Assembles the full section list for an activity: the Solar asset-registry
 * sections or the single Machine section depending on componentType, always
 * followed by the Installation Completion Report section, with the
 * image-checklist sections appended only for Solar (the checklist verifies
 * a Solar installation specifically; Machine entries don't need it).
 */
export function buildReviewSections(
  componentType: "SOLAR" | "MACHINE" | undefined,
  bom: ActivityBillOfMaterial | undefined,
  solarAssetSections: AssetSectionContent[],
  machineAssetData: MachineAssetData,
  installationImageCriteria: InstallationImageCriterion[],
): ReviewSectionContent[] {
  const isSolar = componentType !== "MACHINE";
  const sections: ReviewSectionContent[] = isSolar
    ? solarAssetSections
    : [buildMachineSection(bom, machineAssetData)];
  sections.push(buildReportSection(bom));
  if (isSolar) {
    sections.push(...buildImageChecklistSections(installationImageCriteria));
  }
  return sections;
}

/** Buckets the latest workflow entry's documents by which section they
 * belong to — an asset section by its classified key matching the section
 * id, the report section by the fixed report document types, and an
 * image-checklist section by its criterion code suffix. */
export function buildSectionDocuments(
  sections: ReviewSectionContent[],
  latestDocuments: ActivityDocument[],
): Partial<Record<string, ActivityDocument[]>> {
  const sectionDocuments: Partial<Record<string, ActivityDocument[]>> = {};
  for (const section of sections) {
    if (section.kind === "ASSET") {
      sectionDocuments[section.id] = latestDocuments.filter(
        (document) => classifyDocument(document).key === section.id,
      );
    } else if (section.kind === "REPORT") {
      sectionDocuments[section.id] = latestDocuments.filter((document) =>
        (REPORT_DOCUMENT_TYPES as readonly string[]).includes(document.documentType?.toUpperCase() ?? ""),
      );
    } else {
      // classifyDocument uppercases documentType before deriving `suffix`, so
      // the code extracted here must be uppercased too or a mixed-case MDMS
      // criterion.code would never match any document.
      const code = section.id.slice(`${INSTALLATION_IMAGE_PREFIX}_`.length).toUpperCase();
      sectionDocuments[section.id] = latestDocuments.filter((document) => {
        const classified = classifyDocument(document);
        return classified.key === INSTALLATION_IMAGE_PREFIX && classified.suffix === code;
      });
    }
  }
  return sectionDocuments;
}

function buildSectionReasons(
  transaction: ActivityTransaction | undefined,
  reasonOptions: RejectionReasonOption[],
): AuditSectionReasons[] {
  if (!transaction?.comments?.length) {
    return [];
  }

  const bySection = new Map<string, { reasonLabel: string; comment: string }[]>();
  for (const comment of transaction.comments) {
    let parsed: { reasonCode?: string; comment?: string } = {};
    try {
      parsed = comment.commentMessage ? JSON.parse(comment.commentMessage) : {};
    } catch {
      parsed = { comment: comment.commentMessage };
    }

    const sectionId = comment.assetType ?? "OTHER";
    const reasonLabel =
      reasonOptions.find((option) => option.code === parsed.reasonCode)?.name ??
      (parsed.reasonCode ? humanize(parsed.reasonCode) : sectionId);

    bySection.set(sectionId, [
      ...(bySection.get(sectionId) ?? []),
      { reasonLabel, comment: parsed.comment ?? "" },
    ]);
  }

  return Array.from(bySection.entries()).map(([sectionId, reasons]) => ({
    sectionId,
    sectionLabel: humanize(sectionId),
    reasons,
  }));
}

export function buildAuditTrail(
  workflow: ActivityWorkflowEntry[] | undefined,
  transactions: ActivityTransaction[] | undefined,
  reasonOptions: RejectionReasonOption[],
): ActivityAuditCheckpoint[] {
  const transactionByProcessInstanceId = new Map(
    (transactions ?? [])
      .filter((transaction) => transaction.processInstanceId)
      .map((transaction) => [transaction.processInstanceId as string, transaction]),
  );

  // The API already returns workflow history newest-first (the latest
  // action is pushed to the front) — the timeline renders in that same
  // order, latest at the top.
  return (workflow ?? []).map((entry, index) => {
    const transaction = entry.id ? transactionByProcessInstanceId.get(entry.id) : undefined;
    const sectionReasons = buildSectionReasons(transaction, reasonOptions);

    return {
      id: entry.id ?? `checkpoint-${index}`,
      status: (entry.state?.applicationStatus ?? "SCHEDULED") as ActivityStatus,
      date: entry.auditDetails?.createdTime ? formatEpochDate(entry.auditDetails.createdTime) : "-",
      actorName: entry.assigner?.name,
      comment: entry.comment,
      sectionReasons: sectionReasons.length > 0 ? sectionReasons : undefined,
    };
  });
}
