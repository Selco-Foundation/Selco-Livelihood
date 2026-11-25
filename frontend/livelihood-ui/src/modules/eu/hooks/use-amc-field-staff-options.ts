import { useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { searchAmcFieldStaff } from "../services/amc";
import { toAmcFieldStaffOptions } from "../utils/amc";

/** The AMC field staff of a vendor organisation: its members who hold AMC_FIELD_STAFF. */
export function useAmcFieldStaffOptions(organizationId: string | undefined) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["eu-amc-field-staff", organizationId],
    enabled: Boolean(organizationId && accessToken),
    queryFn: () => searchAmcFieldStaff(organizationId!, accessToken!, user),
    select: toAmcFieldStaffOptions,
  });
}
