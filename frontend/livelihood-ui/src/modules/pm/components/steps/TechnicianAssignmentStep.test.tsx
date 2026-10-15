import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVendorAssignmentSearch } from "../../hooks/use-vendor-assignment-search";
import { useVendorOrganisations } from "../../hooks/use-vendor-organisations";
import { useVendorOrgUsers } from "../../hooks/use-vendor-org-users";
import type { VendorAssignmentSite } from "../../services/vendor-assignment";
import {
  isAssignmentValid,
  TechnicianAssignmentStep,
  toRows,
  toSavedAssignments,
  type TechnicianAssignmentRow,
} from "./TechnicianAssignmentStep";

vi.mock("../../hooks/use-vendor-assignment-search", () => ({ useVendorAssignmentSearch: vi.fn() }));
vi.mock("../../hooks/use-vendor-organisations", () => ({ useVendorOrganisations: vi.fn() }));
vi.mock("../../hooks/use-vendor-org-users", () => ({ useVendorOrgUsers: vi.fn() }));

const sites: VendorAssignmentSite[] = [
  {
    facilityId: "f1",
    siteName: "Site One",
    solutionId: "SOLAR",
    assets: [
      { componentType: "SOLAR", componentSequence: 1, assetName: "Solar Panel" },
      { componentType: "MACHINE", componentSequence: 1, assetName: "Pulverizer" },
    ],
  },
];

describe("toRows", () => {
  it("flattens each site's assets into one row per asset", () => {
    expect(toRows(sites)).toEqual([
      { facilityId: "f1", siteName: "Site One", componentType: "SOLAR", componentSequence: 1, assetName: "Solar Panel" },
      { facilityId: "f1", siteName: "Site One", componentType: "MACHINE", componentSequence: 1, assetName: "Pulverizer" },
    ]);
  });

  it("falls back to facilityId/componentType when siteName/assetName are missing", () => {
    const result = toRows([{ facilityId: "f2", assets: [{ componentType: "SOLAR", componentSequence: 1 }] }]);

    expect(result).toEqual([
      { facilityId: "f2", siteName: "f2", componentType: "SOLAR", componentSequence: 1, assetName: "SOLAR" },
    ]);
  });
});

describe("toSavedAssignments", () => {
  it("includes only assets that already have a vendor assigned", () => {
    const result = toSavedAssignments([
      {
        facilityId: "f1",
        assets: [
          { componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1", vendorUserId: "u1" },
          { componentType: "MACHINE", componentSequence: 1 },
        ],
      },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ facilityId: "f1", componentType: "SOLAR", vendorOrgId: "org-1", vendorUserId: "u1" }),
    ]);
  });
});

describe("isAssignmentValid", () => {
  const rows: TechnicianAssignmentRow[] = [
    { facilityId: "f1", siteName: "Site One", componentType: "SOLAR", componentSequence: 1, assetName: "Solar Panel" },
  ];

  it("is false when there are no rows at all", () => {
    expect(isAssignmentValid([], [])).toBe(false);
  });

  it("is false until every row has both a vendorOrgId and vendorUserId", () => {
    expect(isAssignmentValid([{ facilityId: "f1", componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1" }], rows)).toBe(false);
  });

  it("is true once every row is fully assigned", () => {
    expect(
      isAssignmentValid(
        [{ facilityId: "f1", componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1", vendorUserId: "u1" }],
        rows,
      ),
    ).toBe(true);
  });
});

describe("TechnicianAssignmentStep", () => {
  beforeEach(() => {
    vi.mocked(useVendorAssignmentSearch).mockReturnValue({ data: { sites } } as never);
    vi.mocked(useVendorOrganisations).mockReturnValue({ data: [{ code: "org-1", name: "Vendor Org One" }] } as never);
    vi.mocked(useVendorOrgUsers).mockReturnValue({ data: [{ code: "u1", name: "Tech One" }] } as never);
  });

  it("renders one row per asset, grouped under the site name", () => {
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} />);

    expect(screen.getByText("Site One")).toBeInTheDocument();
    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
    expect(screen.getByText("Pulverizer")).toBeInTheDocument();
  });

  it("selecting a vendor organisation updates the assignment and clears any vendor user", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Vendor Organization, Site One, Solar Panel/i }));
    await user.click(screen.getByText("Vendor Org One"));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ facilityId: "f1", componentType: "SOLAR", vendorOrgId: "org-1", vendorOrgName: "Vendor Org One" }),
    ]);
  });

  it("disables the vendor user select until an organization is chosen", () => {
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Vendor, Site One, Solar Panel/i })).toBeDisabled();
  });

  it("shows no rows when the plan has no sites", () => {
    vi.mocked(useVendorAssignmentSearch).mockReturnValue({ data: { sites: [] } } as never);

    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} />);

    expect(screen.queryByText("Site One")).not.toBeInTheDocument();
  });
});
