export interface VendorUser {
  code: string;
  name: string;
  email: string;
}

export interface VendorOrganization {
  code: string;
  name: string;
  users: VendorUser[];
}

// Mock stand-in for vendor-registry's org -> org-user search
// (`/vendor/organisation/v1/_search` + `/vendor/organisation/v1/user/_search`)
// — no vendor-registry integration exists yet; hardcoded until it's wired
// up. A "vendor" assigned to an asset is really one of an org's users, not
// the org itself — selecting an org here picks its first user for the
// mock, matching the simplified single-vendor-per-row UI.
export const VENDOR_ORGANIZATIONS: VendorOrganization[] = [
  {
    code: "vendor-org-1",
    name: "Selco India (Bengaluru)",
    users: [{ code: "vendor-user-1", name: "Ramesh Iyer", email: "ramesh.iyer@selco-vendor.example" }],
  },
  {
    code: "vendor-org-2",
    name: "Sunrise Solar Solutions",
    users: [{ code: "vendor-user-2", name: "Divya Kulkarni", email: "divya.kulkarni@sunrise-solar.example" }],
  },
  {
    code: "vendor-org-3",
    name: "GreenTech Installers",
    users: [{ code: "vendor-user-3", name: "Suresh Babu", email: "suresh.babu@greentech.example" }],
  },
];
