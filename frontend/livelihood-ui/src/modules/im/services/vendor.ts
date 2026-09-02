import { searchHrmsEmployees, type AuthUser } from "@/shared";
import type { SelectOption } from "../types/create-incident";

const VENDOR_ROLES = ["LIVELIHOOD_VENDOR", "COMPLAINT_RESOLVER"];

/** Vendor users serving `boundaryCode` (a ticket's boundary), for the ASSIGN_VENDOR picker. */
export async function fetchVendorOptions(
  accessToken: string,
  user: AuthUser | null | undefined,
  boundaryCode: string,
): Promise<SelectOption[]> {
  const employees = await searchHrmsEmployees(
    { roles: VENDOR_ROLES.join(","), isActive: true, boundaryCodes: boundaryCode },
    accessToken,
    user,
  );

  return employees
    .filter((employee) => employee.user?.uuid)
    .map((employee) => ({ code: employee.user!.uuid!, name: employee.user!.name ?? "" }));
}
