import { searchHrmsEmployees, type AuthUser } from "@/shared";

const VENDOR_ROLES = ["LIVELIHOOD_VENDOR", "COMPLAINT_RESOLVER"];

export interface VendorOption {
  code: string;
  name: string;
}

/** Vendor users serving `boundaryCode` (a facility's boundary), for the Mapped Vendor picker. */
export async function fetchVendorOptions(
  accessToken: string,
  user: AuthUser | null | undefined,
  boundaryCode: string,
): Promise<VendorOption[]> {
  const employees = await searchHrmsEmployees(
    { roles: VENDOR_ROLES.join(","), isActive: true, boundaryCodes: boundaryCode },
    accessToken,
    user,
  );

  return employees
    .filter((employee) => employee.user?.uuid)
    .map((employee) => ({ code: employee.user!.uuid!, name: employee.user!.name ?? "" }));
}
