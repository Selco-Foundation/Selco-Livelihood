import { translateOr, useTranslate } from "@/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui";
import type { FacilityAsset } from "../../types/asset";

interface AssetDetailDialogProps {
  asset: FacilityAsset | null;
  onClose: () => void;
  assetTypeName: (assetType: string) => string;
}

function SpecRow({ label, value }: { label: string; value?: string }) {
  const { t } = useTranslate();
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-1/2 font-semibold text-foreground">{label}</span>
      <span className="text-muted-foreground">{value || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}</span>
    </div>
  );
}

function AssetSpecGrid({ asset, assetTypeName }: { asset: FacilityAsset; assetTypeName: (assetType: string) => string }) {
  const { t } = useTranslate();
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <SpecRow label={translateOr(t, "ASSET_TYPE", "Asset Type")} value={assetTypeName(asset.assetType)} />
      <SpecRow label={translateOr(t, "ASSET_SERIAL_NO", "Serial No.")} value={asset.serialNumber} />
      <SpecRow label={translateOr(t, "ASSET_BRAND", "Brand")} value={asset.brand} />
      <SpecRow label={translateOr(t, "ASSET_MODEL_NUMBER", "Model Number")} value={asset.modelNumber} />
      <SpecRow label={translateOr(t, "ASSET_CAPACITY", "Capacity")} value={asset.capacity} />
      <SpecRow label={translateOr(t, "ASSET_INSTALLATION_DATE", "Installation Date")} value={asset.installationDate} />
      <SpecRow
        label={translateOr(t, "ASSET_STATUS", "Status")}
        value={
          asset.isOperational
            ? translateOr(t, "OPERATIONAL", "Operational")
            : translateOr(t, "NOT_OPERATIONAL", "Not Operational")
        }
      />
    </div>
  );
}

export function AssetDetailDialog({ asset, onClose, assetTypeName }: AssetDetailDialogProps) {
  const { t } = useTranslate();
  const children = asset?.children ?? [];

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ASSET_DETAILS", "Asset Details")}</DialogTitle>
        </DialogHeader>
        {asset ? (
          <div className="space-y-4">
            <AssetSpecGrid asset={asset} assetTypeName={assetTypeName} />

            <div className="rounded-md border border-border bg-muted/30 p-4">
              <h3 className="mb-3 text-base font-semibold text-foreground">
                {translateOr(t, "ASSET_CHILD_ASSETS", "Child Assets")}
              </h3>
              {children.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {translateOr(t, "ASSET_NO_CHILD_ASSETS", "No child assets")}
                </p>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => (
                    <div key={child.assetId} className="rounded-md border border-border p-3">
                      <AssetSpecGrid asset={child} assetTypeName={assetTypeName} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
