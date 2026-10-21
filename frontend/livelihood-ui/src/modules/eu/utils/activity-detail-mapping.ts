import { buildAuditTrail, buildReviewSections, buildSectionDocuments } from "@/shared";
import type { InstallationImageCriterion, MachineAssetData, RejectionReasonOption } from "@/shared";
import type { ActivityDocument, ActivityInfoCardFields, AssetSectionContent } from "@/ui";
import type { ActivityFacilityRow } from "../services/activity-detail";
import type { ActivityDetail } from "../types/activity-detail";

// Mirrors ir's utils/activity-review-mapping.ts — this is the eu analogue of
// buildActivityReviewDetail, producing the same shared display shapes
// (@/ui's ActivityInfoCardFields/ActivityAuditCheckpoint/ReviewSectionContent)
// from the same backend data via @/shared's activity-workflow-mapping, minus
// anything review-action-only (no ReviewActivity, no workflowDocuments — eu
// never submits a decision).

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

export function buildActivityDetail(
  row: ActivityFacilityRow,
  installationImageCriteria: InstallationImageCriterion[],
  // Real Panel/Battery/Inverter sections sourced from the asset-registry
  // search (see hooks/use-activity-details.ts + @/shared's asset-mapping) —
  // empty for a Machine entry since it doesn't use it (machineAssetData is
  // its equivalent below).
  solarAssetSections: AssetSectionContent[],
  reasonOptions: RejectionReasonOption[],
  machineAssetData: MachineAssetData,
): ActivityDetail {
  const activityFacility = row.activityFacility;
  const latestDocuments = (row.workflow?.[0]?.documents ?? []) as ActivityDocument[];
  const sections = buildReviewSections(
    activityFacility?.componentType,
    activityFacility?.billOfMaterial,
    solarAssetSections,
    machineAssetData,
    installationImageCriteria,
  );

  return {
    facilityName: activityFacility?.facility?.facility_name,
    info: buildActivityInfo(row),
    sections,
    auditTrail: buildAuditTrail(row.workflow, row.transactions, reasonOptions),
    sectionDocuments: buildSectionDocuments(sections, latestDocuments),
  };
}
