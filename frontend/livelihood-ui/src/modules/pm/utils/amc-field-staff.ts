import type { OrgUserSearchResponse } from "../services/vendor-registry";

/** The role the backend requires of an AMC's field staff (`AMC_FIELD_STAFF_ROLE_MISSING` otherwise). */
export const AMC_FIELD_STAFF_ROLE = "AMC_FIELD_STAFF";

export interface AmcFieldStaffOption {
  code: string;
  name: string;
}

/** Members of the organisation who hold `AMC_FIELD_STAFF`: the dropdown's view of the backend's check. */
export function toAmcFieldStaffOptions(response: OrgUserSearchResponse | undefined): AmcFieldStaffOption[] {
  return (response?.OrgUsers ?? [])
    .filter((member) => member.user?.roles?.some((role) => role.code === AMC_FIELD_STAFF_ROLE))
    .flatMap((member) => {
      const code = member.userId ?? member.id;
      return code ? [{ code, name: member.user?.name ?? code }] : [];
    });
}
