import { translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { Building, Handshake, Users } from "lucide-react";
import { useOrgUsers } from "../hooks/use-org-users";
import { useOrganisations, useOwnOrganisationId } from "../hooks/use-organisations";
import { hasOrgPocAccess, hasOrgSuperAdminAccess } from "../utils/access";
import { orgMyOrganisationPath, orgPlatformsPath, orgVendorsPath } from "../utils/paths";

/** Only the total is needed, so ask for a single row and read the count. */
const COUNT_ONLY = { limit: 1, offset: 0 };

/**
 * Home-page KPI tiles for the org module:
 *  - Super Admin: total Platform Organisations and total Vendor Organisations.
 *  - Organisation POC / Vendor POC: total users in their own organisation.
 * A user with both kinds of role sees all three.
 */
export function OrgKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = hasOrgSuperAdminAccess(user?.roles);
  const isPoc = hasOrgPocAccess(user?.roles);

  // Hooks always run in the same order; `enabled` stops requests for tiles the user won't see.
  const platformOrgs = useOrganisations({ orgType: "PLATFORM", ...COUNT_ONLY }, isSuperAdmin);
  const vendorOrgs = useOrganisations({ orgType: "VENDOR", ...COUNT_ONLY }, isSuperAdmin);
  const ownOrganisation = useOwnOrganisationId(isPoc);
  const ownUsers = useOrgUsers(isPoc ? (ownOrganisation.data ?? "") : "");

  if (!isSuperAdmin && !isPoc) {
    return null;
  }

  const countOf = (isLoading: boolean, value: number | undefined) => (isLoading ? "-" : String(value ?? 0));

  return (
    <>
      {isSuperAdmin ? (
        <>
          <StatTile
            icon={<Building className="h-6 w-6" />}
            label={translateOr(t, "ORG_TOTAL_PLATFORM_ORGS", "Total Platform Organisations")}
            value={countOf(platformOrgs.isLoading, platformOrgs.data?.total)}
            link={orgPlatformsPath()}
          />
          <StatTile
            icon={<Handshake className="h-6 w-6" />}
            iconClassName="bg-info text-info-foreground"
            label={translateOr(t, "ORG_TOTAL_VENDOR_ORGS", "Total Vendor Organisations")}
            value={countOf(vendorOrgs.isLoading, vendorOrgs.data?.total)}
            link={orgVendorsPath()}
          />
        </>
      ) : null}
      {isPoc ? (
        <StatTile
          icon={<Users className="h-6 w-6" />}
          iconClassName="bg-warning text-warning-foreground"
          label={translateOr(t, "ORG_TOTAL_USERS", "Total Users")}
          value={
            ownOrganisation.data === null
              ? "-" // not linked to any organisation
              : countOf(ownOrganisation.isLoading || ownUsers.isLoading, ownUsers.data?.length)
          }
          link={orgMyOrganisationPath()}
        />
      ) : null}
    </>
  );
}
