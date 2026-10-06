import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import { Button, SearchableSelect, Skeleton } from "@/ui";
import { Eye, Save } from "lucide-react";
import { useState } from "react";
import { CategoryFilterPopover, type FilterCategoryDef } from "../CategoryFilterPopover";
import { useAssetTypeOptions } from "../../hooks/use-asset-type-options";
import { useFacilityAssets } from "../../hooks/use-facility-assets";
import { useUpdateAssetVendor } from "../../hooks/use-update-asset-vendor";
import { useVendorOptions } from "../../hooks/use-vendor-options";
import type { VendorOption } from "../../services/vendor";
import { EMPTY_ASSET_FILTERS, type AssetFilters, type FacilityAsset } from "../../types/asset";
import { AssetDetailDialog } from "./AssetDetailDialog";

const ASSET_STATUS_OPTIONS = [
  { code: "OPERATIONAL", name: "Operational" },
  { code: "NON_OPERATIONAL", name: "Not Operational" },
];

interface FacilityAssetTabProps {
  facilityId: string;
  facilityBoundaryCode: string | undefined;
}

export function FacilityAssetTab({ facilityId, facilityBoundaryCode }: FacilityAssetTabProps) {
  const { t } = useTranslate();
  const [filters, setFilters] = useState<AssetFilters>(EMPTY_ASSET_FILTERS);
  const [viewingAsset, setViewingAsset] = useState<FacilityAsset | null>(null);
  const [draftVendorByAssetId, setDraftVendorByAssetId] = useState<Record<string, string>>({});
  const [savedOverrideByAssetId, setSavedOverrideByAssetId] = useState<Record<string, string>>({});

  const { assetTypes } = useAssetTypeOptions();
  const { data: assets, isLoading, isError, error } = useFacilityAssets(facilityId, filters);
  const { data: vendorOptions } = useVendorOptions(facilityBoundaryCode);
  const updateAssetVendor = useUpdateAssetVendor();

  const serialNumberOptions = (assets ?? [])
    .flatMap((asset) => [asset, ...(asset.children ?? [])])
    .filter((asset) => asset.serialNumber)
    .map((asset) => ({ code: asset.serialNumber!, name: asset.serialNumber! }));

  const categories: FilterCategoryDef[] = [
    { key: "assetType", label: translateOr(t, "ASSET_TYPE", "Asset Type"), options: assetTypes },
    { key: "isOperational", label: translateOr(t, "ASSET_STATUS", "Status"), options: ASSET_STATUS_OPTIONS },
    { key: "serialNumber", label: translateOr(t, "ASSET_SERIAL_NO", "Serial No."), options: serialNumberOptions },
  ];

  function toggleOption(categoryKey: string, code: string) {
    if (categoryKey === "isOperational") {
      // Status only ever has one active value at a time, unlike the multi-select filters below.
      setFilters({ ...filters, isOperational: [code] });
      return;
    }
    const key = categoryKey as "assetType" | "serialNumber";
    const current = filters[key];
    setFilters({
      ...filters,
      [key]: current.includes(code) ? current.filter((value) => value !== code) : [...current, code],
    });
  }

  function assetTypeName(assetType: string): string {
    return assetTypes.find((option) => option.code === assetType)?.name ?? assetType;
  }

  function effectiveVendorId(asset: FacilityAsset): string {
    return savedOverrideByAssetId[asset.assetId] ?? asset.vendorId ?? "";
  }

  function vendorOptionsForRow(asset: FacilityAsset): VendorOption[] {
    const options = vendorOptions ?? [];
    const current = effectiveVendorId(asset);
    if (!current || options.some((option) => option.code === current)) {
      return options;
    }
    // The current mapping's uuid isn't in the fetched vendor list (e.g. the asset search
    // response only ever returns a raw uuid, never a resolved name) — show it as-is rather
    // than falling back to a blank placeholder.
    return [...options, { code: current, name: current }];
  }

  function isDirty(asset: FacilityAsset): boolean {
    const draft = draftVendorByAssetId[asset.assetId];
    return draft !== undefined && draft !== effectiveVendorId(asset);
  }

  function handleSaveVendor(asset: FacilityAsset) {
    const vendorId = draftVendorByAssetId[asset.assetId];
    if (!vendorId) return;
    updateAssetVendor.mutate(
      { assetId: asset.assetId, vendorId },
      {
        onSuccess: () => {
          setSavedOverrideByAssetId((prev) => ({ ...prev, [asset.assetId]: vendorId }));
          setDraftVendorByAssetId((prev) => {
            const next = { ...prev };
            delete next[asset.assetId];
            return next;
          });
        },
      },
    );
  }

  return (
    <div className="space-y-5">
      <CategoryFilterPopover
        categories={categories}
        selected={filters}
        onToggle={toggleOption}
        onClearAll={() => setFilters(EMPTY_ASSET_FILTERS)}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-destructive">
          {extractApiErrorMessage(error) ?? translateOr(t, "CS_ASSETS_FETCH_FAILED", "Failed to load assets")}
        </div>
      ) : !assets || assets.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_NO_ASSETS_FOUND", "No assets found")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_TYPE", "Asset Type")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_SERIAL_NO", "Serial No.")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_INSTALLATION_DATE", "Installation Date")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_STATUS", "Status")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_BRAND", "Brand")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_MODEL_NUMBER", "Model Number")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_CAPACITY", "Capacity")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_VENDOR", "Mapped Vendor")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "ASSET_ACTIONS", "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, index) => {
                  const typeName = assetTypeName(asset.assetType);
                  const rowLabel = `${typeName}, ${asset.serialNumber ?? asset.assetId}`;
                  return (
                    <tr
                      key={asset.assetId}
                      className={
                        index % 2 === 1 ? "border-b border-border/70 bg-accent" : "border-b border-border/70"
                      }
                    >
                      <td className="px-5 py-4 text-foreground">{typeName || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{asset.serialNumber || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{asset.installationDate || "-"}</td>
                      <td className="px-5 py-4 text-foreground">
                        {asset.isOperational
                          ? translateOr(t, "OPERATIONAL", "Operational")
                          : translateOr(t, "NOT_OPERATIONAL", "Not Operational")}
                      </td>
                      <td className="px-5 py-4 text-foreground">{asset.brand || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{asset.modelNumber || "-"}</td>
                      <td className="px-5 py-4 text-foreground">{asset.capacity || "-"}</td>
                      <td className="px-5 py-4">
                        <SearchableSelect
                          ariaLabel={`${translateOr(t, "ASSET_VENDOR", "Mapped Vendor")}, ${rowLabel}`}
                          value={draftVendorByAssetId[asset.assetId] ?? effectiveVendorId(asset)}
                          options={vendorOptionsForRow(asset)}
                          onChange={(option) =>
                            setDraftVendorByAssetId((prev) => ({ ...prev, [asset.assetId]: option?.code ?? "" }))
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={translateOr(t, "ASSET_VIEW", "View")}
                            onClick={() => setViewingAsset(asset)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={translateOr(t, "CORE_COMMON_SAVE", "Save")}
                            disabled={!isDirty(asset) || updateAssetVendor.isPending}
                            onClick={() => handleSaveVendor(asset)}
                          >
                            <Save className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssetDetailDialog asset={viewingAsset} onClose={() => setViewingAsset(null)} assetTypeName={assetTypeName} />
    </div>
  );
}
