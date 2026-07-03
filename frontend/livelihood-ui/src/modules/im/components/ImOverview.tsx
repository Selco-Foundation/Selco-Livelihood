import {
  contextPath,
  loadModules,
  useAuthStore,
  useTranslate,
} from "@/shared";
import { Button, PageHeader, StatTile } from "@/ui";
import { Link } from "@tanstack/react-router";
import { Clock, FileText, Plus } from "lucide-react";
import { useEffect } from "react";
import { EndUserAssetsList } from "./EndUserAssetsList";
import { useEndUserAssets } from "../hooks/use-end-user-assets";
import { useImInboxSummary } from "../hooks/use-im-inbox-summary";
import { canCreateIncident, hasImAccess, isEndUser } from "../utils/access";

function translateOr(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

export function ImOverview() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const basePath = `/${contextPath()}/employee/im`;
  const { data, isLoading } = useImInboxSummary();
  const endUser = isEndUser(user?.roles);
  const { assets, isLoading: isAssetsLoading } = useEndUserAssets({ enabled: endUser });

  useEffect(() => {
    void loadModules(["rainmaker-im"]);
  }, []);

  if (!hasImAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={translateOr(t, "IM_HEADER", "Manage Tickets")}
        action={
          canCreateIncident(user?.roles) ? (
            <Button asChild className="gap-2 rounded-md px-5">
              <Link to={`${basePath}/incident/create`}>
                <Plus className="size-4" />
                {translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise new ticket")}
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile
          icon={<FileText className="h-5 w-5" />}
          iconClassName="bg-blue-100 text-blue-600"
          label={t("TOTAL_IM")}
          value={isLoading ? "-" : (data?.totalCount ?? "-")}
          link={`${basePath}/inbox`}
        />
        <StatTile
          icon={<Clock className="h-5 w-5" />}
          iconClassName="bg-amber-100 text-amber-600"
          label={t("TOTAL_NEARING_SLA")}
          value={isLoading ? "-" : (data?.nearingSlaCount ?? "-")}
          link={`${basePath}/inbox?nearing=1`}
        />
      </div>
      {endUser ? (
        <EndUserAssetsList assets={assets} isLoading={isAssetsLoading} />
      ) : null}
    </div>
  );
}
