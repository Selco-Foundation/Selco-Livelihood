import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetTypeOptions } from "../../hooks/use-asset-type-options";
import { useFacilityAssets } from "../../hooks/use-facility-assets";
import { useUpdateAssetVendor } from "../../hooks/use-update-asset-vendor";
import { useVendorOptions } from "../../hooks/use-vendor-options";
import type { FacilityAsset } from "../../types/asset";
import { FacilityAssetTab } from "./FacilityAssetTab";

vi.mock("../../hooks/use-asset-type-options", () => ({ useAssetTypeOptions: vi.fn() }));
vi.mock("../../hooks/use-facility-assets", () => ({ useFacilityAssets: vi.fn() }));
vi.mock("../../hooks/use-vendor-options", () => ({ useVendorOptions: vi.fn() }));
vi.mock("../../hooks/use-update-asset-vendor", () => ({ useUpdateAssetVendor: vi.fn() }));

const solarAsset: FacilityAsset = {
  assetId: "solar-1",
  assetType: "SOLAR",
  serialNumber: "SN-SOLAR-1",
  vendorId: "v1",
  children: [
    { assetId: "panel-1", assetType: "PANEL", serialNumber: "SN-PANEL-1", brand: "Acme" },
  ],
};

const standaloneAsset: FacilityAsset = {
  assetId: "machine-1",
  assetType: "MACHINE",
  serialNumber: "SN-MACHINE-1",
  vendorId: "unknown-uuid",
};

function mockHooks(assets: FacilityAsset[]) {
  vi.mocked(useAssetTypeOptions).mockReturnValue({
    isLoading: false,
    assetTypes: [
      { code: "SOLAR", name: "Solar System" },
      { code: "PANEL", name: "Panel" },
      { code: "MACHINE", name: "Machine" },
    ],
  });
  vi.mocked(useFacilityAssets).mockReturnValue({
    data: assets,
    isLoading: false,
    isError: false,
    error: null,
  } as never);
  vi.mocked(useVendorOptions).mockReturnValue({
    data: [
      { code: "v1", name: "Vendor One" },
      { code: "v2", name: "Vendor Two" },
    ],
  } as never);
  vi.mocked(useUpdateAssetVendor).mockReturnValue({
    mutate: vi.fn((_payload, options) => options?.onSuccess?.(undefined, _payload, undefined)),
    isPending: false,
  } as never);
}

beforeEach(() => {
  vi.mocked(useAssetTypeOptions).mockReset();
  vi.mocked(useFacilityAssets).mockReset();
  vi.mocked(useVendorOptions).mockReset();
  vi.mocked(useUpdateAssetVendor).mockReset();
});

describe("FacilityAssetTab", () => {
  it("disables the row's Save action until the Mapped Vendor dropdown is changed", async () => {
    mockHooks([solarAsset]);
    const user = userEvent.setup();
    render(<FacilityAssetTab facilityId="facility-1" facilityBoundaryCode="boundary-1" />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Mapped Vendor, Solar System, SN-SOLAR-1/i }));
    await user.click(screen.getByText("Vendor Two"));

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows the raw vendor uuid in the dropdown when it isn't among the fetched vendor options", () => {
    mockHooks([standaloneAsset]);
    render(<FacilityAssetTab facilityId="facility-1" facilityBoundaryCode="boundary-1" />);

    expect(screen.getByRole("button", { name: /Mapped Vendor/i })).toHaveTextContent("unknown-uuid");
  });

  it("opens the detail popup with the asset's own specs and its child assets via the eye icon", async () => {
    mockHooks([solarAsset]);
    const user = userEvent.setup();
    render(<FacilityAssetTab facilityId="facility-1" facilityBoundaryCode="boundary-1" />);

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("Asset Details")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(screen.getByText("SN-PANEL-1")).toBeInTheDocument();
  });

  it("shows a 'no child assets' note for a standalone asset with no children", async () => {
    mockHooks([standaloneAsset]);
    const user = userEvent.setup();
    render(<FacilityAssetTab facilityId="facility-1" facilityBoundaryCode="boundary-1" />);

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getByText("No child assets")).toBeInTheDocument();
  });
});
