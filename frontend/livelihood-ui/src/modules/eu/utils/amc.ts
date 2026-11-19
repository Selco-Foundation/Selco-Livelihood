import type { AssetAmc, FacilityAmcSearchResponse } from "../types/amc";

/** The role the backend requires of an AMC's field staff. */
export const AMC_FIELD_STAFF_ROLE = "AMC_FIELD_STAFF";

const RUNNING_STATUSES = ["PENDING_ACTIVATION", "ACTIVE"];

/** The running AMCs of a facility, each with the ids of the assets it covers. */
export function toAssetAmcs(response: FacilityAmcSearchResponse | undefined): AssetAmc[] {
  return (response?.AmcConfigurations ?? [])
    .filter((amc) => RUNNING_STATUSES.includes(amc.status))
    .map((amc) => ({
      id: amc.id,
      activityFacilityId: amc.activityFacilityId,
      assetIds: (amc.assetsAmc ?? []).flatMap((entry) => (entry.assetId ? [entry.assetId] : [])),
      fieldStaffId: amc.fieldStaff?.uuid,
      fieldStaffName: amc.fieldStaff?.name ?? undefined,
    }));
}

export function findAssetAmc(amcs: AssetAmc[], assetId: string): AssetAmc | undefined {
  return amcs.find((amc) => amc.assetIds.includes(assetId));
}

interface RawOrgUser {
  id?: string;
  userId?: string;
  user?: { name?: string; roles?: { code?: string }[] };
}

/** Members of the organisation who hold `AMC_FIELD_STAFF`. */
export function toAmcFieldStaffOptions(response: { OrgUsers?: RawOrgUser[] } | undefined) {
  return (response?.OrgUsers ?? [])
    .filter((member) => member.user?.roles?.some((role) => role.code === AMC_FIELD_STAFF_ROLE))
    .flatMap((member) => {
      const code = member.userId ?? member.id;
      return code ? [{ code, name: member.user?.name ?? code }] : [];
    });
}
