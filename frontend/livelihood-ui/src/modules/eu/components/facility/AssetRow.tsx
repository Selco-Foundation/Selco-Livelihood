import { translateOr, useTranslate } from "@/shared";
import { Button } from "@/ui";
import { Eye, Save } from "lucide-react";
import { useState } from "react";
import { PaginatedSearchableSelect } from "../PaginatedSearchableSelect";
import { useUpdateAmcFieldStaff } from "../../hooks/use-update-amc-field-staff";
import { useUpdateAssetVendor } from "../../hooks/use-update-asset-vendor";
import { useVendorOrganisationOptions } from "../../hooks/use-vendor-organisation-options";
import { useVendorUserOptions } from "../../hooks/use-vendor-user-options";
import type { AssetAmc } from "../../types/amc";
import type { FacilityAsset } from "../../types/asset";
import { AmcFieldStaffDialog } from "./AmcFieldStaffDialog";

interface AssetRowProps {
  asset: FacilityAsset;
  isAlternate: boolean;
  assetTypeName: (assetType: string) => string;
  onView: (asset: FacilityAsset) => void;
  /** The asset's running AMC, if any: a vendor change then also asks for its new field staff. */
  amc?: AssetAmc;
}

export function AssetRow({ asset, isAlternate, assetTypeName, onView, amc }: AssetRowProps) {
  const { t } = useTranslate();
  const [selectedOrgId, setSelectedOrgId] = useState(asset.vendor?.organisationId ?? "");
  const [draftVendorUserId, setDraftVendorUserId] = useState<string | undefined>(undefined);
  const [savedOverrideVendorId, setSavedOverrideVendorId] = useState<string | undefined>(undefined);
  const updateAssetVendor = useUpdateAssetVendor();
  const updateAmcFieldStaff = useUpdateAmcFieldStaff();
  const [pickingFieldStaff, setPickingFieldStaff] = useState(false);

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
    setQuery: setVendorQuery,
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
    if (!isDirty || !draftVendorUserId || !selectedOrgId) return;
    if (amc) setPickingFieldStaff(true);
    else saveVendor();
  }

  /** The AMC moves first: if it is refused nothing has changed, and the admin can simply retry. */
  function handleFieldStaffConfirm(fieldStaffUserId: string) {
    if (!amc) return;
    updateAmcFieldStaff.mutate(
      { activityFacilityId: amc.activityFacilityId, fieldStaffUserId, vendorOrgId: selectedOrgId },
      {
        onSuccess: () => {
          setPickingFieldStaff(false);
          saveVendor();
        },
      },
    );
  }

  function saveVendor() {
    if (!draftVendorUserId) return;
    updateAssetVendor.mutate(
      { assetId: asset.assetId, vendorId: draftVendorUserId, organisationId: selectedOrgId },
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
          onQueryChange={setVendorQuery}
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
        {amc ? (
          <AmcFieldStaffDialog
            key={selectedOrgId}
            open={pickingFieldStaff}
            organizationId={selectedOrgId}
            currentFieldStaffId={amc.fieldStaffId}
            warnVendorChange={Boolean(amc.isActive) && amc.vendorOrgId !== selectedOrgId}
            isPending={updateAmcFieldStaff.isPending}
            onConfirm={handleFieldStaffConfirm}
            onCancel={() => setPickingFieldStaff(false)}
          />
        ) : null}
      </td>
    </tr>
  );
}
