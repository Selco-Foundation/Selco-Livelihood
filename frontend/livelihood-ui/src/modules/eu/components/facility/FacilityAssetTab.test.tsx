import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAssetTypeOptions } from "../../hooks/use-asset-type-options";
import { useFacilityAssets } from "../../hooks/use-facility-assets";
import type { FacilityAsset } from "../../types/asset";
import { FacilityAssetTab } from "./FacilityAssetTab";

vi.mock("../../hooks/use-asset-type-options", () => ({ useAssetTypeOptions: vi.fn() }));
vi.mock("../../hooks/use-facility-assets", () => ({ useFacilityAssets: vi.fn() }));
vi.mock("./AssetRow", () => ({
  AssetRow: ({ asset, onView }: { asset: FacilityAsset; onView: (asset: FacilityAsset) => void }) => (
    <tr>
      <td>
        <button type="button" onClick={() => onView(asset)}>
          {asset.assetId}
        </button>
      </td>
    </tr>
  ),
}));

const solarAsset: FacilityAsset = {
  assetId: "solar-1",
  assetType: "SOLAR",
  serialNumber: "SN-SOLAR-1",
  children: [{ assetId: "panel-1", assetType: "PANEL", serialNumber: "SN-PANEL-1" }],
};

function mockHooks(assets: FacilityAsset[], overrides: Partial<ReturnType<typeof useFacilityAssets>> = {}) {
  vi.mocked(useAssetTypeOptions).mockReturnValue({
    isLoading: false,
    assetTypes: [
      { code: "SOLAR", name: "Solar System" },
      { code: "PANEL", name: "Panel" },
    ],
  });
  vi.mocked(useFacilityAssets).mockReturnValue({
    data: assets,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.mocked(useAssetTypeOptions).mockReset();
  vi.mocked(useFacilityAssets).mockReset();
});

describe("FacilityAssetTab", () => {
  it("shows a loading skeleton while the assets query is loading", () => {
    mockHooks([], { isLoading: true, data: undefined });

    const { container } = render(<FacilityAssetTab facilityId="facility-1" />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows an error state when the assets query fails", () => {
    mockHooks([], { isError: true, error: new Error("boom"), data: undefined });

    render(<FacilityAssetTab facilityId="facility-1" />);

    expect(screen.getByText("Failed to load assets")).toBeInTheDocument();
  });

  it("shows an empty state when there are no assets", () => {
    mockHooks([]);

    render(<FacilityAssetTab facilityId="facility-1" />);

    expect(screen.getByText("No assets found")).toBeInTheDocument();
  });

  it("renders one row per top-level asset and opens the detail dialog via the row's view callback", async () => {
    mockHooks([solarAsset]);
    const user = userEvent.setup();
    render(<FacilityAssetTab facilityId="facility-1" />);

    expect(screen.getByText("solar-1")).toBeInTheDocument();

    await user.click(screen.getByText("solar-1"));

    expect(screen.getByText("Asset Details")).toBeInTheDocument();
    expect(screen.getByText("Panel")).toBeInTheDocument();
  });
});
