import { MACHINE_MEDIA_GROUPS, REVIEW_SECTION_LABELS } from "../constants/review";
import { REJECTION_REASON_OPTIONS } from "../constants/rejection-reasons";
import { formatEpochDate } from "./date-format";
import { toFacilityEntry } from "./facility-entry-mapping";
import { classifyDocument, INSTALLATION_IMAGE_PREFIX, REPORT_DOCUMENT_TYPES } from "./facility-documents";
import type { InstallationImageCriterion } from "./installation-image-mapping";
import type {
  ActivityBillOfMaterial,
  ActivityBomComponent,
  ActivityDocument,
  ActivityFacilityRow,
  ActivityTransaction,
  ActivityWorkflowEntry,
  AssetItem,
  AssetSectionContent,
  AuditSectionReasons,
  FacilityAuditCheckpoint,
  FacilityEntryStatus,
  FacilityReviewDetail,
  ImageChecklistSectionContent,
  LabeledValue,
  ReportSectionContent,
  ReviewSectionContent,
  ReviewSectionId,
  SolarSectionId,
} from "../types/facility-review";

const SOLAR_ASSET_SECTION_IDS: SolarSectionId[] = ["PANEL", "BATTERY", "INVERTER"];

function humanize(id: string): string {
  return id
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSolarCategory(category: string | undefined): SolarSectionId {
  const normalized = category?.toLowerCase() ?? "";
  if (normalized.includes("batter")) {
    return "BATTERY";
  }
  if (normalized.includes("invert")) {
    return "INVERTER";
  }
  // Falls back to Panel — the only category confirmed in a real sample so
  // far; adjust once a multi-category BOM sample is available.
  return "PANEL";
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

function buildMachineSection(bom: ActivityBillOfMaterial | undefined): AssetSectionContent {
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

  return {
    kind: "ASSET",
    id: "MACHINE",
    labelKey,
    label,
    specifications,
    items: toAssetItems(bom?.data?.components ?? []),
    images: [],
    videos: [],
    mediaGroups: MACHINE_MEDIA_GROUPS.map((group) => ({
      id: group.id,
      labelKey: group.labelKey,
      label: group.label,
      images: [],
      videos: [],
    })),
  };
}

function buildSolarSections(bom: ActivityBillOfMaterial | undefined): AssetSectionContent[] {
  const components = bom?.data?.components ?? [];
  const grouped = new Map<SolarSectionId, ActivityBomComponent[]>();
  for (const component of components) {
    const sectionId = normalizeSolarCategory(component.category);
    grouped.set(sectionId, [...(grouped.get(sectionId) ?? []), component]);
  }

  return SOLAR_ASSET_SECTION_IDS.filter((id) => grouped.get(id)?.length).map((id) => {
    const { labelKey, label } = REVIEW_SECTION_LABELS[id];
    const items = toAssetItems(grouped.get(id) ?? []);
    return {
      kind: "ASSET",
      id,
      labelKey,
      label,
      count: items.length,
      specifications: [],
      items,
      images: [],
      videos: [],
    } satisfies AssetSectionContent;
  });
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
    installationCompletionCertificate: null,
    assetHandoverDocument: null,
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

function buildSectionReasons(transaction: ActivityTransaction | undefined): AuditSectionReasons[] {
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
      REJECTION_REASON_OPTIONS.find((option) => option.code === parsed.reasonCode)?.name ??
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

function buildAuditTrail(
  workflow: ActivityWorkflowEntry[] | undefined,
  transactions: ActivityTransaction[] | undefined,
): FacilityAuditCheckpoint[] {
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
    const sectionReasons = buildSectionReasons(transaction);

    return {
      id: entry.id ?? `checkpoint-${index}`,
      status: (entry.state?.applicationStatus ?? "SCHEDULED") as FacilityEntryStatus,
      date: entry.auditDetails?.createdTime ? formatEpochDate(entry.auditDetails.createdTime) : "-",
      actorName: entry.assigner?.name,
      comment: entry.comment,
      sectionReasons: sectionReasons.length > 0 ? sectionReasons : undefined,
    };
  });
}

export function buildFacilityReviewDetail(
  row: ActivityFacilityRow,
  installationImageCriteria: InstallationImageCriterion[],
): FacilityReviewDetail {
  const { activityFacility } = row;
  const entry = toFacilityEntry(row);
  const latestWorkflow = row.workflow?.[0];
  const latestDocuments = latestWorkflow?.documents ?? [];

  const isSolar = activityFacility.componentType !== "MACHINE";
  const sections: ReviewSectionContent[] = isSolar
    ? buildSolarSections(activityFacility.billOfMaterial)
    : [buildMachineSection(activityFacility.billOfMaterial)];
  sections.push(buildReportSection(activityFacility.billOfMaterial));
  // The installation-image checklist (site overview / nameplate / earthing
  // photos) verifies a Solar installation specifically — Machine entries
  // don't need it.
  if (isSolar) {
    sections.push(...buildImageChecklistSections(installationImageCriteria));
  }

  const sectionDocuments: Partial<Record<ReviewSectionId, ActivityDocument[]>> = {};
  for (const section of sections) {
    if (section.kind === "ASSET") {
      sectionDocuments[section.id] = documentsForKey(latestDocuments, section.id);
    } else if (section.kind === "REPORT") {
      sectionDocuments[section.id] = latestDocuments.filter((document) =>
        (REPORT_DOCUMENT_TYPES as readonly string[]).includes(document.documentType?.toUpperCase() ?? ""),
      );
    } else {
      const code = section.id.slice(`${INSTALLATION_IMAGE_PREFIX}_`.length);
      sectionDocuments[section.id] = latestDocuments.filter((document) => {
        const classified = classifyDocument(document);
        return classified.key === INSTALLATION_IMAGE_PREFIX && classified.suffix === code;
      });
    }
  }

  return {
    entry,
    sections,
    auditTrail: buildAuditTrail(row.workflow, row.transactions),
    sectionDocuments,
  };
}
