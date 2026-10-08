import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Eye, Save } from "lucide-react";
import { useState } from "react";
import { PaginatedSearchableSelect } from "../PaginatedSearchableSelect";
import { useUpdateAssetVendor } from "../../hooks/use-update-asset-vendor";
import { useVendorOrganisationOptions } from "../../hooks/use-vendor-organisation-options";
import { useVendorUserOptions } from "../../hooks/use-vendor-user-options";
import type { FacilityAsset } from "../../types/asset";

interface AssetRowProps {
  asset: FacilityAsset;
  isAlternate: boolean;
  assetTypeName: (assetType: string) => string;
  onView: (asset: FacilityAsset) => void;
}

export function AssetRow({ asset, isAlternate, assetTypeName, onView }: AssetRowProps) {
  const { t } = useTranslate();
  const [selectedOrgId, setSelectedOrgId] = useState(asset.vendor?.organisationId ?? "");
  const [draftVendorUserId, setDraftVendorUserId] = useState<string | undefined>(undefined);
  const [savedOverrideVendorId, setSavedOverrideVendorId] = useState<string | undefined>(undefined);
  const updateAssetVendor = useUpdateAssetVendor();

  const orgPinned =
    asset.vendor?.organisationId && asset.vendor?.organisationName
      ? { code: asset.vendor.organisationId, name: asset.vendor.organisationName }
      : undefined;
  const { options: orgOptions, query: orgQuery, setQuery: setOrgQuery, isLoading: isOrgLoading } =
    useVendorOrganisationOptions(orgPinned);

  // Only the asset's own org still carries a known vendor name as a pinned fallback — switching
  // to a different org means starting that org's vendor list fresh with nothing pre-selected.
  const vendorPinned =
    selectedOrgId && selectedOrgId === asset.vendor?.organisationId && asset.vendor?.userId && asset.vendor?.name
      ? { code: asset.vendor.userId, name: asset.vendor.name }
      : undefined;
  const {
    options: vendorOptions,
    hasMore: hasMoreVendors,
    loadMore: loadMoreVendors,
    isLoading: isVendorLoading,
  } = useVendorUserOptions(selectedOrgId || undefined, vendorPinned);

  const effectiveVendorId = savedOverrideVendorId ?? asset.vendorId ?? "";
  const isDirty = Boolean(draftVendorUserId) && draftVendorUserId !== effectiveVendorId;
  const typeName = assetTypeName(asset.assetType);
  const rowLabel = `${typeName}, ${asset.serialNumber ?? asset.assetId}`;

  function handleOrganizationChange(orgId: string) {
    setSelectedOrgId(orgId);
    setDraftVendorUserId(undefined);
  }

  function handleSave() {
    if (!isDirty || !draftVendorUserId) return;
    updateAssetVendor.mutate(
      { assetId: asset.assetId, vendorId: draftVendorUserId },
      {
        onSuccess: () => {
          setSavedOverrideVendorId(draftVendorUserId);
          setDraftVendorUserId(undefined);
        },
      },
    );
  }

  return (
    <tr className={isAlternate ? "border-b border-border/70 bg-accent" : "border-b border-border/70"}>
      <td className="truncate px-5 py-4 text-foreground">{typeName || "-"}</td>
      <td className="truncate px-5 py-4 text-foreground">{asset.serialNumber || "-"}</td>
      <td className="truncate px-5 py-4 text-foreground">{asset.installationDate || "-"}</td>
      <td className="truncate px-5 py-4 text-foreground">
        {asset.isOperational
          ? translateOr(t, "OPERATIONAL", "Operational")
          : translateOr(t, "NOT_OPERATIONAL", "Not Operational")}
      </td>
      <td className="truncate px-5 py-4 text-foreground">{asset.brand || "-"}</td>
      <td className="truncate px-5 py-4 text-foreground">{asset.modelNumber || "-"}</td>
      <td className="px-5 py-4">
        <PaginatedSearchableSelect
          ariaLabel={`${translateOr(t, "ASSET_VENDOR_ORGANIZATION", "Vendor Organization")}, ${rowLabel}`}
          value={selectedOrgId}
          options={orgOptions}
          isLoading={isOrgLoading}
          onQueryChange={setOrgQuery}
          onChange={(option) => handleOrganizationChange(option?.code ?? "")}
        />
      </td>
      <td className="px-5 py-4">
        <PaginatedSearchableSelect
          key={selectedOrgId}
          ariaLabel={`${translateOr(t, "ASSET_VENDOR", "Vendor")}, ${rowLabel}`}
          value={draftVendorUserId ?? effectiveVendorId}
          options={vendorOptions}
          disabled={!selectedOrgId}
          isLoading={isVendorLoading}
          hasMore={hasMoreVendors}
          onLoadMore={loadMoreVendors}
          onChange={(option) => setDraftVendorUserId(option?.code ?? "")}
        />
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translateOr(t, "ASSET_VIEW", "View")}
            onClick={() => onView(asset)}
          >
            <Eye className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={translateOr(t, "CORE_COMMON_SAVE", "Save")}
            disabled={!isDirty || updateAssetVendor.isPending}
            onClick={handleSave}
          >
            <Save className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
