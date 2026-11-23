import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAmcFieldStaffOptions } from "../../hooks/use-amc-field-staff-options";
import { useUpdateAmcFieldStaff } from "../../hooks/use-update-amc-field-staff";
import { useUpdateAssetVendor } from "../../hooks/use-update-asset-vendor";
import { useVendorOrganisationOptions } from "../../hooks/use-vendor-organisation-options";
import { useVendorUserOptions } from "../../hooks/use-vendor-user-options";
import type { AssetAmc } from "../../types/amc";
import type { FacilityAsset } from "../../types/asset";
import { AssetRow } from "./AssetRow";

vi.mock("../../hooks/use-vendor-organisation-options", () => ({ useVendorOrganisationOptions: vi.fn() }));
vi.mock("../../hooks/use-vendor-user-options", () => ({ useVendorUserOptions: vi.fn() }));
vi.mock("../../hooks/use-amc-field-staff-options", () => ({ useAmcFieldStaffOptions: vi.fn() }));
vi.mock("../../hooks/use-update-amc-field-staff", () => ({ useUpdateAmcFieldStaff: vi.fn() }));
vi.mock("../../hooks/use-update-asset-vendor", () => ({ useUpdateAssetVendor: vi.fn() }));

function renderRow(asset: FacilityAsset, onView = vi.fn(), amc?: AssetAmc) {
  return render(
    <table>
      <tbody>
        <AssetRow asset={asset} isAlternate={false} assetTypeName={(code) => code} onView={onView} amc={amc} />
      </tbody>
    </table>,
  );
}

const assetWithVendor: FacilityAsset = {
  assetId: "a1",
  assetType: "SOLAR",
  serialNumber: "SN-1",
  vendorId: "vendor-1",
  vendor: { userId: "vendor-1", name: "Vendor One", organisationId: "org-1", organisationName: "Org One" },
};

const mutateMock = vi.fn((_payload: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());

const amcMutateMock = vi.fn((_payload: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());

beforeEach(() => {
  vi.mocked(useVendorOrganisationOptions).mockReset();
  vi.mocked(useVendorUserOptions).mockReset();
  vi.mocked(useUpdateAssetVendor).mockReset();
  mutateMock.mockClear();

  vi.mocked(useVendorOrganisationOptions).mockReturnValue({
    options: [
      { code: "org-1", name: "Org One" },
      { code: "org-2", name: "Org Two" },
    ],
    query: "",
    setQuery: vi.fn(),
    isLoading: false,
  });
  vi.mocked(useUpdateAssetVendor).mockReturnValue({ mutate: mutateMock, isPending: false } as never);
  amcMutateMock.mockClear();
  vi.mocked(useUpdateAmcFieldStaff).mockReturnValue({ mutate: amcMutateMock, isPending: false } as never);
  vi.mocked(useAmcFieldStaffOptions).mockReturnValue({
    data: [
      { code: "fs-1", name: "Field One" },
      { code: "fs-2", name: "Field Two" },
    ],
    isLoading: false,
  } as never);
});

describe("AssetRow", () => {
  it("shows the asset's current org/vendor names immediately via the pinned option, before any page has loaded", () => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [{ code: "vendor-1", name: "Vendor One" }],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });

    renderRow(assetWithVendor);

    expect(screen.getByRole("button", { name: /Vendor Organization,/i })).toHaveTextContent("Org One");
    expect(screen.getByRole("button", { name: /^Vendor,/i })).toHaveTextContent("Vendor One");
  });

  it("disables Save until a different vendor is actually picked", async () => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [
        { code: "vendor-1", name: "Vendor One" },
        { code: "vendor-2", name: "Vendor Two" },
      ],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });
    const user = userEvent.setup();
    renderRow(assetWithVendor);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /^Vendor,/i }));
    await user.click(screen.getByText("Vendor Two"));

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("switching the organization clears the drafted vendor selection and loads the new org's own vendors", async () => {
    vi.mocked(useVendorUserOptions).mockImplementation((organizationId) =>
      organizationId === "org-2"
        ? {
            options: [{ code: "vendor-9", name: "Org Two Vendor" }],
            setQuery: vi.fn(),
            hasMore: false,
            loadMore: vi.fn(),
            isLoading: false,
          }
        : {
            options: [{ code: "vendor-1", name: "Vendor One" }],
            setQuery: vi.fn(),
            hasMore: false,
            loadMore: vi.fn(),
            isLoading: false,
          },
    );
    const user = userEvent.setup();
    renderRow(assetWithVendor);

    await user.click(screen.getByRole("button", { name: /Vendor Organization/i }));
    await user.click(screen.getByText("Org Two"));

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Vendor,/i })).not.toHaveTextContent("Vendor One");

    await user.click(screen.getByRole("button", { name: /^Vendor,/i }));
    expect(screen.getByText("Org Two Vendor")).toBeInTheDocument();
  });

  it("saves the drafted vendor and settles Save back to disabled on success", async () => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [
        { code: "vendor-1", name: "Vendor One" },
        { code: "vendor-2", name: "Vendor Two" },
      ],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });
    const user = userEvent.setup();
    renderRow(assetWithVendor);

    await user.click(screen.getByRole("button", { name: /^Vendor,/i }));
    await user.click(screen.getByText("Vendor Two"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      { assetId: "a1", vendorId: "vendor-2", organisationId: "org-1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("calls onView with the asset when the eye icon is clicked", async () => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });
    const onView = vi.fn();
    const user = userEvent.setup();
    renderRow(assetWithVendor, onView);

    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onView).toHaveBeenCalledWith(assetWithVendor);
  });
  it("asks for the AMC field staff when the asset has a running AMC, moves the AMC, then saves the vendor", async () => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [
        { code: "vendor-1", name: "Vendor One" },
        { code: "vendor-2", name: "Vendor Two" },
      ],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });
    const user = userEvent.setup();
    renderRow(assetWithVendor, vi.fn(), { id: "amc-1", activityFacilityId: "af-1", assetIds: ["a1"], fieldStaffId: "fs-1", isActive: true, vendorOrgId: "org-1" });

    await user.click(screen.getByRole("button", { name: /^Vendor,/i }));
    await user.click(screen.getByText("Vendor Two"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Select the AMC field staff")).toBeInTheDocument();
    expect(screen.queryByText(/The AMC moves to another vendor/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Field One/ }));
    await user.click(screen.getByText("Field Two"));
    const saveButtons = screen.getAllByRole("button", { name: "Save" });
    await user.click(saveButtons[saveButtons.length - 1]);

    expect(amcMutateMock).toHaveBeenCalledWith(
      { activityFacilityId: "af-1", fieldStaffUserId: "fs-2", vendorOrgId: "org-1" },
      expect.any(Object),
    );
    expect(mutateMock).toHaveBeenCalledWith(
      { assetId: "a1", vendorId: "vendor-2", organisationId: "org-1" },
      expect.any(Object),
    );
  });

  it.each([
    { isActive: true, warned: true },
    { isActive: false, warned: false },
  ])("warns about open visits when an AMC of another organisation moves (active: $isActive)", async ({ isActive, warned }) => {
    vi.mocked(useVendorUserOptions).mockReturnValue({
      options: [{ code: "vendor-2", name: "Vendor Two" }],
      setQuery: vi.fn(),
      hasMore: false,
      loadMore: vi.fn(),
      isLoading: false,
    });
    const user = userEvent.setup();
    renderRow(assetWithVendor, vi.fn(), { id: "amc-1", activityFacilityId: "af-1", assetIds: ["a1"], isActive, vendorOrgId: "org-0" });

    await user.click(screen.getByRole("button", { name: /^Vendor,/i }));
    await user.click(screen.getByText("Vendor Two"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Select the AMC field staff")).toBeInTheDocument();
    expect(screen.queryAllByText(/The AMC moves to another vendor/)).toHaveLength(warned ? 1 : 0);
  });
});
