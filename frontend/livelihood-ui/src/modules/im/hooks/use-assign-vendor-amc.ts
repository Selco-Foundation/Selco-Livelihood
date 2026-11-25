import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchFacilityAmcs, searchOrgUsers } from "../services/amc";
import { findRunningAssetAmc, toAmcFieldStaffOptions, toPrimaryOrganisationId } from "../utils/amc";

/**
 * What ASSIGN_VENDOR needs for the ticket's AMC: whether the ticket's asset has a running AMC, the
 * chosen vendor user's organisation, and that organisation's AMC field staff. Moving the asset to a
 * new vendor must also move its AMC, so the AMC field staff is then required (decided 2026-11-20).
 */
export function useAssignVendorAmc(
  { tenantId, facilityId, assetId }: { tenantId: string; facilityId?: string; assetId?: string },
  vendorUserUuid: string | undefined,
  enabled: boolean,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const amcQuery = useQuery({
    queryKey: ["im-asset-amc", tenantId, facilityId, assetId],
    enabled: enabled && Boolean(accessToken && facilityId && assetId),
    queryFn: () => searchFacilityAmcs(facilityId!, tenantId, accessToken!, user),
    select: (response) => findRunningAssetAmc(response, assetId),
  });
  const amc = amcQuery.data ?? null;

  const orgQuery = useQuery({
    queryKey: ["im-vendor-org", tenantId, vendorUserUuid],
    enabled: Boolean(amc && accessToken && vendorUserUuid),
    queryFn: () => searchOrgUsers({ userIds: [vendorUserUuid!] }, tenantId, accessToken!, user),
    select: toPrimaryOrganisationId,
  });
  const vendorOrgId = orgQuery.data;

  const staffQuery = useQuery({
    queryKey: ["im-amc-field-staff", tenantId, vendorOrgId],
    enabled: Boolean(amc && accessToken && vendorOrgId),
    queryFn: () => searchOrgUsers({ organizationIds: [vendorOrgId!] }, tenantId, accessToken!, user),
    select: toAmcFieldStaffOptions,
  });

  return {
    amc,
    isAmcLoading: amcQuery.isLoading,
    vendorOrgId,
    fieldStaffOptions: staffQuery.data ?? [],
    isFieldStaffLoading: orgQuery.isLoading || staffQuery.isLoading,
  };
}
