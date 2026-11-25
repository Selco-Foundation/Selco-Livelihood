import type { AssetAmc, FacilityAmcSearchResponse, OrgUserSearchResponse } from "../types/amc";

/** The role the backend requires of an AMC's field staff. */
export const AMC_FIELD_STAFF_ROLE = "AMC_FIELD_STAFF";

const RUNNING_STATUSES = new Set(["PENDING_ACTIVATION", "ACTIVE"]);

/** The running AMC that covers the ticket's asset, if any. */
export function findRunningAssetAmc(response: FacilityAmcSearchResponse | undefined, assetId: string | undefined): AssetAmc | null {
  if (!assetId) return null;
  const amc = (response?.AmcConfigurations ?? []).find(
    (config) =>
      RUNNING_STATUSES.has(config.status) && (config.assetsAmc ?? []).some((entry) => entry.assetId === assetId),
  );
  return amc
    ? {
        id: amc.id,
        activityFacilityId: amc.activityFacilityId,
        assetIds: (amc.assetsAmc ?? []).flatMap((entry) => (entry.assetId ? [entry.assetId] : [])),
        isActive: amc.status === "ACTIVE",
        vendorOrgId: amc.vendorId ?? undefined,
        fieldStaffId: amc.fieldStaff?.uuid,
      }
    : null;
}

/**
 * The vendor user's organisation: the first one they belong to, as the incident service does when
 * it moves the asset to that vendor (`resolvePrimaryOrganisationIdForUser`).
 */
export function toPrimaryOrganisationId(response: OrgUserSearchResponse | undefined): string | undefined {
  return response?.OrgUsers?.find((membership) => membership.organizationId)?.organizationId;
}

/** Members of the organisation who hold `AMC_FIELD_STAFF`. */
export function toAmcFieldStaffOptions(response: OrgUserSearchResponse | undefined) {
  return (response?.OrgUsers ?? [])
    .filter((member) => member.user?.roles?.some((role) => role.code === AMC_FIELD_STAFF_ROLE))
    .flatMap((member) => {
      const code = member.userId ?? member.id;
      return code ? [{ code, name: member.user?.name ?? code }] : [];
    });
}
