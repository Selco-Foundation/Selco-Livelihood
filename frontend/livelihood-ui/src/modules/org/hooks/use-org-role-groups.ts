import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orgService } from "../services";
import { roleGroupId, type OrgRole, type OrgRoleGroup, type OrgType } from "../types/organisation";
import { useOrgApiContext } from "./use-org-api-context";

/**
 * The role groups assignable for one organisation type — Platform orgs only
 * ever see organisation-side roles, Vendor orgs only vendor-side ones.
 */
export function useOrgRoleGroups(orgType: OrgType | undefined) {
  const { ctx } = useOrgApiContext();

  const { data, isLoading } = useQuery({
    queryKey: ["org-role-catalog"],
    enabled: Boolean(ctx),
    staleTime: Infinity,
    queryFn: () => orgService.fetchRoleCatalog(ctx!),
  });

  return useMemo(() => {
    const groups = (data?.groups ?? []).filter((group) => group.orgType === orgType);
    const roles = (data?.roles ?? []).filter((role) => role.orgType === orgType);
    return {
      isLoading,
      groups,
      /**
       * Expand the selected groups (by id) into the role objects the backend expects.
       * A code with no `OrgRoles` entry is still sent (named by its code) so the
       * backend rejects it visibly instead of the user silently missing a role.
       */
      rolesForGroups: (groupIds: string[]): Array<Pick<OrgRole, "code" | "name">> => {
        const codes = [
          ...new Set(
            groups.filter((group) => groupIds.includes(roleGroupId(group))).flatMap((group) => group.roleCodes),
          ),
        ];
        return codes.map((code) => roles.find((role) => role.code === code) ?? { code, name: code });
      },
      /** Groups a user holds — a group counts only when every one of its roles is present. */
      groupsForRoleCodes: (roleCodes: string[]): OrgRoleGroup[] =>
        groups.filter(
          (group) => group.roleCodes.length > 0 && group.roleCodes.every((code) => roleCodes.includes(code)),
        ),
    };
  }, [data, isLoading, orgType]);
}
