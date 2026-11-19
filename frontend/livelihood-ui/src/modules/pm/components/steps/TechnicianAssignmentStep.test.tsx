import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAmcFieldStaffOptions } from "../../hooks/use-amc-field-staff-options";
import { usePlanAmcBySite } from "../../hooks/use-plan-amc-by-site";
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

vi.mock("../../hooks/use-amc-field-staff-options", () => ({ useAmcFieldStaffOptions: vi.fn() }));
vi.mock("../../hooks/use-plan-amc-by-site", () => ({ usePlanAmcBySite: vi.fn() }));
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
    vi.mocked(usePlanAmcBySite).mockReturnValue({ data: {} } as never);
    vi.mocked(useAmcFieldStaffOptions).mockReturnValue({ data: [] } as never);
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

describe("TechnicianAssignmentStep AMC applicable column", () => {
  beforeEach(() => {
    vi.mocked(useVendorAssignmentSearch).mockReturnValue({ data: { sites } } as never);
    vi.mocked(useVendorOrganisations).mockReturnValue({ data: [] } as never);
    vi.mocked(useVendorOrgUsers).mockReturnValue({ data: [] } as never);
    vi.mocked(usePlanAmcBySite).mockReturnValue({ data: {} } as never);
    vi.mocked(useAmcFieldStaffOptions).mockReturnValue({ data: [] } as never);
  });

  it("shows a switch for the solar asset only, defaulting to No", () => {
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} onAmcSetupChange={vi.fn()} />);

    expect(screen.getByRole("switch", { name: "AMC applicable, Site One, Solar Panel" })).not.toBeChecked();
    expect(screen.queryByRole("switch", { name: "AMC applicable, Site One, Pulverizer" })).not.toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("toggling a row reports the new flag keyed by site and sequence", async () => {
    const user = userEvent.setup();
    const onAmcSetupChange = vi.fn();
    render(
      <TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} onAmcSetupChange={onAmcSetupChange} />,
    );

    await user.click(screen.getByRole("switch", { name: "AMC applicable, Site One, Solar Panel" }));

    expect(onAmcSetupChange).toHaveBeenCalledWith({ "f1:SOLAR:1": { applicable: true } });
  });

  it("Apply for all switches every solar row on", async () => {
    const user = userEvent.setup();
    const onAmcSetupChange = vi.fn();
    render(
      <TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} onAmcSetupChange={onAmcSetupChange} />,
    );

    await user.click(screen.getByRole("switch", { name: "Apply for all" }));

    expect(onAmcSetupChange).toHaveBeenCalledWith({ "f1:SOLAR:1": { applicable: true } });
  });

  it("keeps the AMC switches usable when the plan is locked (published)", () => {
    render(
      <TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} locked onAmcSetupChange={vi.fn()} />,
    );

    expect(screen.getByRole("switch", { name: "Apply for all" })).toBeEnabled();
    expect(screen.getByRole("switch", { name: "AMC applicable, Site One, Solar Panel" })).toBeEnabled();
  });

  it("shows a solar site's running AMC read-only instead of a switch", () => {
    vi.mocked(usePlanAmcBySite).mockReturnValue({
      data: {
        f1: {
          id: "amc-1",
          status: "PENDING_ACTIVATION",
          activityFacilityId: "af1",
          visitFrequencyMonths: 6,
          durationMonths: 24,
          fieldStaff: { uuid: "s1", name: "Ravi Kumar" },
        },
      },
    } as never);
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} locked onAmcSetupChange={vi.fn()} />);

    expect(screen.queryByRole("switch", { name: "AMC applicable, Site One, Solar Panel" })).not.toBeInTheDocument();
    expect(screen.getByText("Pending activation")).toBeInTheDocument();
  });

  it("lists the AMC field staff of the row's organization once AMC is on", async () => {
    const user = userEvent.setup();
    const onAmcSetupChange = vi.fn();
    vi.mocked(useAmcFieldStaffOptions).mockReturnValue({ data: [{ code: "s1", name: "Ravi Kumar" }] } as never);
    render(
      <TechnicianAssignmentStep
        planId="plan-1"
        value={[{ facilityId: "f1", componentType: "SOLAR", componentSequence: 1, vendorOrgId: "org-1" }]}
        onChange={vi.fn()}
        amcSetup={{ "f1:SOLAR:1": { applicable: true } }}
        onAmcSetupChange={onAmcSetupChange}
      />,
    );

    expect(useAmcFieldStaffOptions).toHaveBeenCalledWith("org-1");
    await user.click(screen.getByRole("button", { name: "AMC field staff, Site One, Solar Panel" }));
    await user.click(screen.getByText("Ravi Kumar"));
    expect(onAmcSetupChange).toHaveBeenCalledWith({
      "f1:SOLAR:1": { applicable: true, fieldStaffId: "s1", fieldStaffName: "Ravi Kumar" },
    });
  });

  it("shows no field staff dropdown while AMC is off", () => {
    render(<TechnicianAssignmentStep planId="plan-1" value={[]} onChange={vi.fn()} onAmcSetupChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /AMC field staff/ })).not.toBeInTheDocument();
  });
});
