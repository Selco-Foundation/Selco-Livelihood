import { useTranslate } from "@/shared";
import { Badge, Card } from "@/ui";
import { Package } from "lucide-react";
import { useState } from "react";
import type { EndUserAsset } from "../hooks/use-end-user-assets";

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

interface EndUserAssetsListProps {
  assets: EndUserAsset[];
  isLoading: boolean;
}

function assetSubtitle(asset: EndUserAsset) {
  const category = asset.modelNumber ?? asset.assetTypeId;
  const serial = asset.serialNumber ? `#${asset.serialNumber}` : undefined;
  return [category, serial].filter(Boolean).join(" • ");
}

function AssetThumbnail({ asset }: { asset: EndUserAsset }) {
  const [failed, setFailed] = useState(false);

  if (asset.imageUrl && !failed) {
    return (
      <img
        src={asset.imageUrl}
        alt={asset.name}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Package className="h-5 w-5" />
    </div>
  );
}

function AssetRow({ asset }: { asset: EndUserAsset }) {
  const { t } = useTranslate();
  const subtitle = assetSubtitle(asset);

  return (
    <Card className="livelihood-card flex-row items-center gap-4 border-border p-4 shadow-sm">
      <AssetThumbnail asset={asset} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{asset.name}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {asset.isOperational !== undefined ? (
        <Badge
          variant="outline"
          className={
            asset.isOperational
              ? "shrink-0 border-transparent bg-green-100 text-green-700"
              : "shrink-0 border-transparent bg-red-100 text-red-700"
          }
        >
          {asset.isOperational
            ? translateOr(t, "ES_IM_ASSET_OPERATIONAL", "Operational")
            : translateOr(t, "ES_IM_ASSET_NOT_OPERATIONAL", "Not operational")}
        </Badge>
      ) : null}
    </Card>
  );
}

export function EndUserAssetsList({ assets, isLoading }: EndUserAssetsListProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">
        {translateOr(t, "ES_IM_MY_REGISTERED_ASSETS", "My Registered Assets")}
      </h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "CS_COMMON_LOADING", "Loading...")}
        </p>
      ) : assets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translateOr(t, "ES_IM_NO_ASSETS_FOUND", "No assets found")}
        </p>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => (
            <AssetRow key={asset.assetId} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
