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
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Package className="h-6 w-6" />
    </div>
  );
}

function AssetBlock({ asset }: { asset: EndUserAsset }) {
  const { t } = useTranslate();
  const subtitle = assetSubtitle(asset);

  return (
    <Card className="livelihood-card flex-row items-center gap-4 border-border p-4 shadow-none">
      <AssetThumbnail asset={asset} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base leading-6 font-semibold text-ink-950">{asset.name}</p>
        {subtitle ? (
          <p className="truncate text-sm leading-[21px] text-ink-600">{subtitle}</p>
        ) : null}
      </div>
      <Badge variant={asset.isOperational ? "success" : "secondary"} className="shrink-0">
        {asset.isOperational
          ? translateOr(t, "ES_IM_ASSET_OPERATIONAL", "Operational")
          : translateOr(t, "ES_IM_ASSET_NOT_OPERATIONAL", "Not Operational")}
      </Badge>
    </Card>
  );
}

export function EndUserAssetsList({ assets, isLoading }: EndUserAssetsListProps) {
  const { t } = useTranslate();

  return (
    <div className="space-y-3">
      <h3 className="text-[20px] leading-[30px] font-semibold text-ink-950">
        {translateOr(t, "ES_IM_MY_REGISTERED_ASSETS", "My Registered Assets")}
      </h3>
      <Card className="livelihood-card flex-col items-stretch gap-3 border-border p-4 py-5 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {translateOr(t, "CS_COMMON_LOADING", "Loading...")}
          </p>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {translateOr(t, "ES_IM_NO_ASSETS_FOUND", "No assets found")}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {assets.map((asset) => (
              <AssetBlock key={asset.assetId} asset={asset} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
