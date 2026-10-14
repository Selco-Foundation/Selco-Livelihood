import type { InstallationImageCriterion, RejectionReasonOption } from "@/shared";
import type {
  ActivityAuditCheckpoint,
  ActivityDocument,
  ActivityInfoCardFields,
  AssetItem,
  AssetSectionContent,
  AuditSectionReasons,
  ImageChecklistSectionContent,
  LabeledValue,
  ReportSectionContent,
  ReviewSectionContent,
} from "@/ui";
import { REVIEW_SECTION_LABELS } from "../constants/review";
import type { MachineAssetData } from "./asset-mapping";
import { classifyDocument, INSTALLATION_IMAGE_PREFIX, REPORT_DOCUMENT_TYPES } from "./facility-documents";
import type {
  ActivityBillOfMaterial,
  ActivityBomComponent,
  ActivityFacilityRow,
  ActivityTransaction,
  ActivityWorkflowEntry,
} from "../services/activity-detail";
import type { ActivityDetail } from "../types/activity-detail";

// Mirrors ir's utils/activity-review-mapping.ts — this is the eu analogue of
// buildActivityReviewDetail, producing the same shared display shapes
// (@/ui's ActivityInfoCardFields/ActivityAuditCheckpoint/ReviewSectionContent)
// from the same backend data, minus anything review-action-only (no
// ReviewActivity, no workflowDocuments — eu never submits a decision).

export function humanize(id: string): string {
  return id
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEpochDate(epochMs: number): string {
  const date = new Date(epochMs);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function toAssetItems(components: ActivityBomComponent[]): AssetItem[] {
  return components.map((component, index) => ({
    itemNumber: component.slNo ?? index + 1,
    label: component.product,
    capacity: component.capacity,
    quantity: component.quantity,
    images: [],
  }));
}

function documentsForKey(documents: ActivityDocument[], key: string): ActivityDocument[] {
  return documents.filter((document) => classifyDocument(document).key === key);
}

export function buildActivityInfo(row: ActivityFacilityRow): ActivityInfoCardFields {
  const activityFacility = row.activityFacility;
  const boundary = activityFacility?.facility?.boundary;

  return {
    district: boundary?.district ? { code: boundary.district } : undefined,
    block: boundary?.block ? { code: boundary.block } : undefined,
    componentType: activityFacility?.componentType ?? "SOLAR",
    status: activityFacility?.status ?? "SCHEDULED",
  };
}

function buildMachineSection(
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

function buildReportSection(bom: ActivityBillOfMaterial | undefined): ReportSectionContent {
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

function buildImageChecklistSections(
  criteria: InstallationImageCriterion[],
): ImageChecklistSectionContent[] {
  return criteria.map((criterion) => ({
    kind: "IMAGE_CHECKLIST",
    id: `${INSTALLATION_IMAGE_PREFIX}_${criterion.code}`,
    label: criterion.description,
    images: [],
  }));
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

  return (workflow ?? []).map((entry, index) => {
    const transaction = entry.id ? transactionByProcessInstanceId.get(entry.id) : undefined;
    const sectionReasons = buildSectionReasons(transaction, reasonOptions);

    return {
      id: entry.id ?? `checkpoint-${index}`,
      status: entry.state?.applicationStatus ?? "SCHEDULED",
      date: entry.auditDetails?.createdTime ? formatEpochDate(entry.auditDetails.createdTime) : "-",
      actorName: entry.assigner?.name,
      comment: entry.comment,
      sectionReasons: sectionReasons.length > 0 ? sectionReasons : undefined,
    };
  });
}

export function buildActivityDetail(
  row: ActivityFacilityRow,
  installationImageCriteria: InstallationImageCriterion[],
  // Real Panel/Battery/Inverter sections sourced from the asset-registry
  // search (see hooks/use-activity-details.ts + utils/asset-mapping.ts) —
  // empty for a Machine entry since it doesn't use it (machineAssetData is
  // its equivalent below).
  solarAssetSections: AssetSectionContent[],
  reasonOptions: RejectionReasonOption[],
  machineAssetData: MachineAssetData,
): ActivityDetail {
  const activityFacility = row.activityFacility;
  const latestWorkflow = row.workflow?.[0];
  const latestDocuments = (latestWorkflow?.documents ?? []) as ActivityDocument[];

  const isSolar = activityFacility?.componentType !== "MACHINE";
  const sections: ReviewSectionContent[] = isSolar
    ? solarAssetSections
    : [buildMachineSection(activityFacility?.billOfMaterial, machineAssetData)];
  sections.push(buildReportSection(activityFacility?.billOfMaterial));
  if (isSolar) {
    sections.push(...buildImageChecklistSections(installationImageCriteria));
  }

  const sectionDocuments: Partial<Record<string, ActivityDocument[]>> = {};
  for (const section of sections) {
    if (section.kind === "ASSET") {
      sectionDocuments[section.id] = documentsForKey(latestDocuments, section.id);
    } else if (section.kind === "REPORT") {
      sectionDocuments[section.id] = latestDocuments.filter((document) =>
        (REPORT_DOCUMENT_TYPES as readonly string[]).includes(document.documentType?.toUpperCase() ?? ""),
      );
    } else {
      const code = section.id.slice(`${INSTALLATION_IMAGE_PREFIX}_`.length).toUpperCase();
      sectionDocuments[section.id] = latestDocuments.filter((document) => {
        const classified = classifyDocument(document);
        return classified.key === INSTALLATION_IMAGE_PREFIX && classified.suffix === code;
      });
    }
  }

  return {
    facilityName: activityFacility?.facility?.facility_name,
    info: buildActivityInfo(row),
    sections,
    auditTrail: buildAuditTrail(row.workflow, row.transactions, reasonOptions),
    sectionDocuments,
  };
}
