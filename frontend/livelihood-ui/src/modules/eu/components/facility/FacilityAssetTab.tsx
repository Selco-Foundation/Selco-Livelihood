import { extractApiErrorMessage, translateOr, useTranslate } from "@/shared";
import { Button, Skeleton } from "@/ui";
import { useState } from "react";
import { CategoryFilterPopover, type FilterCategoryDef } from "../CategoryFilterPopover";
import { useAssetTypeOptions } from "../../hooks/use-asset-type-options";
import { useFacilityAssets } from "../../hooks/use-facility-assets";
import { EMPTY_ASSET_FILTERS, type AssetFilters, type FacilityAsset } from "../../types/asset";
import { AssetSpecsDialog } from "./AssetSpecsDialog";

const ASSET_STATUS_OPTIONS = [
  { code: "OPERATIONAL", name: "Operational" },
  { code: "NON_OPERATIONAL", name: "Not Operational" },
];

interface FacilityAssetTabProps {
  facilityId: string;
}

export function FacilityAssetTab({ facilityId }: FacilityAssetTabProps) {
  const { t } = useTranslate();
  const [filters, setFilters] = useState<AssetFilters>(EMPTY_ASSET_FILTERS);
  const [viewingAsset, setViewingAsset] = useState<FacilityAsset | null>(null);

  const { assetTypes } = useAssetTypeOptions();
  const { data: assets, isLoading, isError, error } = useFacilityAssets(facilityId, filters);

  const serialNumberOptions = (assets ?? [])
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
            <table className="w-full min-w-[900px] border-collapse text-sm">
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
                    {translateOr(t, "ASSET_SPECS", "Specs")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset, index) => (
                  <tr
                    key={asset.assetId}
                    className={index % 2 === 1 ? "border-b border-border/70 bg-accent" : "border-b border-border/70"}
                  >
                    <td className="px-5 py-4 text-foreground">{assetTypeName(asset.assetType) || "-"}</td>
                    <td className="px-5 py-4 text-foreground">{asset.serialNumber || "-"}</td>
                    <td className="px-5 py-4 text-foreground">{asset.installationDate || "-"}</td>
                    <td className="px-5 py-4 text-foreground">
                      {asset.isOperational
                        ? translateOr(t, "OPERATIONAL", "Operational")
                        : translateOr(t, "NOT_OPERATIONAL", "Not Operational")}
                    </td>
                    <td className="px-5 py-4">
                      <Button type="button" variant="outline" size="sm" onClick={() => setViewingAsset(asset)}>
                        {translateOr(t, "VIEW_SPECS", "View Specs")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssetSpecsDialog asset={viewingAsset} onClose={() => setViewingAsset(null)} />
    </div>
  );
}
