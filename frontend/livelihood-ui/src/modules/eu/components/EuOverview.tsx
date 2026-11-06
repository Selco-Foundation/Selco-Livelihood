import { loadModules, translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { Building2 } from "lucide-react";
import { useEffect } from "react";
import { useFacilitySummary } from "../hooks/use-facility-summary";
import { hasEuAccess } from "../utils/access";
import { euFacilitiesPath } from "../utils/paths";

export function EuKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data: total, isLoading } = useFacilitySummary();

  useEffect(() => {
    void loadModules(["rainmaker-eu"]);
  }, []);

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  return (
    <StatTile
      icon={<Building2 className="h-6 w-6" />}
      iconClassName="bg-info text-info-foreground"
      label={translateOr(t, "TOTAL_END_USER_SITES", "Total End User Sites")}
      value={isLoading ? "-" : (total ?? "-")}
      link={euFacilitiesPath()}
    />
  );
}
