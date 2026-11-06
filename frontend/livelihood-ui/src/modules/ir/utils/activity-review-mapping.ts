import {
  buildAuditTrail,
  buildReviewSections,
  buildSectionDocuments,
  type InstallationImageCriterion,
  type MachineAssetData,
  type RejectionReasonOption,
} from "@/shared";
import type { AssetSectionContent } from "@/ui";
import { toReviewActivity } from "./review-activity-mapping";
import type { ActivityFacilityRow, ActivityReviewDetail } from "../types/activity-review";

export function buildActivityReviewDetail(
  row: ActivityFacilityRow,
  installationImageCriteria: InstallationImageCriterion[],
  // Real Panel/Battery/Inverter sections sourced from the asset-registry
  // search (see hooks/use-activity-review.ts + @/shared's asset-mapping) —
  // the BOM no longer drives Solar's asset sections; empty for a Machine
  // entry since it doesn't use it (machineAssetData is its equivalent below).
  solarAssetSections: AssetSectionContent[],
  // MDMS `Installation.RejectionReasons` options (see
  // @/shared's useRejectionReasonOptions) — used here only to resolve a
  // historical audit-trail comment's reasonCode back to its display name.
  reasonOptions: RejectionReasonOption[],
  // Machine's asset-sourced PO/invoice/warranty/serial-number/spec data —
  // see @/shared's asset-mapping buildMachineAssetData. Unused for Solar.
  machineAssetData: MachineAssetData,
): ActivityReviewDetail {
  const { activityFacility } = row;
  const activity = toReviewActivity(row);
  const latestDocuments = row.workflow?.[0]?.documents ?? [];
  const sections = buildReviewSections(
    activityFacility.componentType,
    activityFacility.billOfMaterial,
    solarAssetSections,
    machineAssetData,
    installationImageCriteria,
  );

  return {
    activity,
    sections,
    auditTrail: buildAuditTrail(row.workflow, row.transactions, reasonOptions),
    sectionDocuments: buildSectionDocuments(sections, latestDocuments),
    workflowDocuments: latestDocuments,
  };
}
