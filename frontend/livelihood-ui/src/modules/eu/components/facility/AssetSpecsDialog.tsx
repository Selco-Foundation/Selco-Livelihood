import { translateOr, useTranslate } from "@/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui";
import type { FacilityAsset } from "../../types/asset";

interface AssetSpecsDialogProps {
  asset: FacilityAsset | null;
  onClose: () => void;
}

export function AssetSpecsDialog({ asset, onClose }: AssetSpecsDialogProps) {
  const { t } = useTranslate();

  const specs = asset
    ? [
        { label: translateOr(t, "ASSET_BRAND", "Brand"), value: asset.brand },
        { label: translateOr(t, "ASSET_MODEL_NUMBER", "Model Number"), value: asset.modelNumber },
        { label: translateOr(t, "ASSET_CAPACITY", "Capacity"), value: asset.capacity },
      ]
    : [];

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translateOr(t, "ASSET_SPECS", "Asset Specs")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {specs.map((spec) => (
            <div key={spec.label} className="flex gap-3 text-sm">
              <span className="w-1/2 font-semibold text-foreground">{spec.label}</span>
              <span className="text-muted-foreground">
                {spec.value || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
