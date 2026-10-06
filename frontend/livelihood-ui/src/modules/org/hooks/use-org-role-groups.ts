import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { orgService } from "../services";
import type { OrgRole, OrgRoleGroup, OrgType } from "../types/organisation";
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
      /** Expand the selected groups into the role objects the backend expects. */
      rolesForGroups: (groupNames: string[]): OrgRole[] => {
        const codes = new Set(
          groups.filter((group) => groupNames.includes(group.name)).flatMap((group) => group.roleCodes),
        );
        return roles.filter((role) => codes.has(role.code));
      },
      /** Groups a user holds — a group counts only when every one of its roles is present. */
      groupsForRoleCodes: (roleCodes: string[]): OrgRoleGroup[] =>
        groups.filter(
          (group) => group.roleCodes.length > 0 && group.roleCodes.every((code) => roleCodes.includes(code)),
        ),
    };
  }, [data, isLoading, orgType]);
}
