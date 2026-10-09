import { employeeHomePath, translateOr, useTranslate } from "@/shared";
import { Skeleton, TopBar } from "@/ui";
import { useState } from "react";
import { useOrgRoleGroups } from "../../hooks/use-org-role-groups";
import { useOrgUsers } from "../../hooks/use-org-users";
import { useOrganisationDetails } from "../../hooks/use-organisations";
import type { OrgUser } from "../../types/organisation";
import { orgListPath } from "../../utils/paths";
import { OrganisationFormDialog } from "../organisation/OrganisationFormDialog";
import { DeleteOrgUserDialog } from "./DeleteOrgUserDialog";
import { OrganisationInfoSection } from "./OrganisationInfoSection";
import { OrgUserFormDialog } from "./OrgUserFormDialog";
import { OrgUserTable } from "./OrgUserTable";

interface OrganisationDetailViewProps {
  organisationId: string;
  /**
   * `admin` — Super Admin: can edit the organisation; breadcrumbs go back to its list.
   * `poc`   — Organisation/Vendor POC on their own organisation: user management only.
   */
  mode: "admin" | "poc";
}

/** Organisation details + user management, shared by the Super Admin details page and the POC landing page. */
export function OrganisationDetailView({ organisationId, mode }: OrganisationDetailViewProps) {
  const { t } = useTranslate();
  const { data: organisation, isLoading } = useOrganisationDetails(organisationId);
  const { data: users = [], isLoading: isUsersLoading } = useOrgUsers(organisationId);
  const { groupsForRoleCodes } = useOrgRoleGroups(organisation?.orgType);

  const [showEditOrganisation, setShowEditOrganisation] = useState(false);
  const [userDialog, setUserDialog] = useState<{ open: boolean; user?: OrgUser }>({ open: false });
  const [userToDelete, setUserToDelete] = useState<OrgUser | null>(null);

  const overview = { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar title={translateOr(t, "DETAILS", "Organisation Details")} breadcrumbs={[overview]} />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!organisation) {
    return (
      <div className="flex flex-col gap-6">
        <TopBar title={translateOr(t, "DETAILS", "Organisation Details")} breadcrumbs={[overview]} />
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "ORG_EDIT_ORG_NOT_FOUND", "This organisation could not be found")}
        </div>
      </div>
    );
  }

  const listLabel =
    organisation.orgType === "PLATFORM"
      ? translateOr(t, "ORG_PLATFORM_ORGANIZATIONS", "Platform Organisations")
      : translateOr(t, "ORG_VENDOR_ORGANIZATIONS", "Vendor Organisations");

  const breadcrumbs =
    mode === "admin"
      ? [overview, { label: listLabel, to: orgListPath(organisation.orgType) }, { label: organisation.name }]
      : [overview, { label: translateOr(t, "ORG_MY_ORGANISATION", "My Organisation") }];

  return (
    <div className="flex flex-col gap-6">
      <TopBar title={organisation.name} breadcrumbs={breadcrumbs} />

      <OrganisationInfoSection
        organisation={organisation}
        onEdit={mode === "admin" ? () => setShowEditOrganisation(true) : undefined}
      />

      <OrgUserTable
        users={users}
        isLoading={isUsersLoading}
        groupsForRoleCodes={groupsForRoleCodes}
        onAdd={() => setUserDialog({ open: true })}
        onEdit={(user) => setUserDialog({ open: true, user })}
        onDelete={setUserToDelete}
      />

      {mode === "admin" ? (
        <OrganisationFormDialog
          open={showEditOrganisation}
          onOpenChange={setShowEditOrganisation}
          orgType={organisation.orgType}
          organisation={organisation}
        />
      ) : null}

      <OrgUserFormDialog
        open={userDialog.open}
        onOpenChange={(open) => setUserDialog((current) => ({ ...current, open }))}
        organisation={organisation}
        user={userDialog.user}
      />

      <DeleteOrgUserDialog
        organisationId={organisation.id}
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
}
