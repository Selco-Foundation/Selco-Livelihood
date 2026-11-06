import { translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { ClipboardCheck } from "lucide-react";
import { useInstallationPlans } from "../hooks/use-installation-plans";
import { hasIrAccess } from "../utils/access";
import { irInstallationPlansPath } from "../utils/paths";

export function IrKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useInstallationPlans();

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  return (
    <StatTile
      icon={<ClipboardCheck className="h-6 w-6" />}
      iconClassName="bg-info text-info-foreground"
      label={translateOr(t, "ES_IR_TOTAL_INSTALLATION_PLANS", "Total Installation Plans")}
      value={isLoading ? "-" : String(data?.totalCount ?? 0)}
      link={irInstallationPlansPath()}
    />
  );
}
