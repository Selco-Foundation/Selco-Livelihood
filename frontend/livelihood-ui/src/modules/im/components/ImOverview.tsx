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
import { LanguageSwitcher } from "@/modules/core";
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
  const canCreate = canCreateIncident(user?.roles);
  const displayName = user?.name ?? user?.userName ?? "";
  const welcomeTitle = displayName
    ? `${translateOr(t, "ES_IM_WELCOME", "Welcome")}, ${displayName}`
    : translateOr(t, "ES_IM_WELCOME", "Welcome");

  useEffect(() => {
    void loadModules(["rainmaker-im"]);
  }, []);

  if (!hasImAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={welcomeTitle}
        description={translateOr(
          t,
          "ES_IM_OVERVIEW_SUBTITLE",
          "Here's what's happening with your tickets and registered assets today.",
        )}
        action={
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {canCreate ? (
              <>
                <span aria-hidden="true" className="h-8 w-px bg-border" />
                <Button asChild size="sm" className="gap-1.5 rounded-md px-4 text-sm font-semibold">
                  <Link to={`${basePath}/incident/create`}>
                    <Plus className="size-4" />
                    {translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise new ticket")}
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-wrap gap-4">
        <StatTile
          icon={<FileText className="h-6 w-6" />}
          iconClassName="bg-info text-info-foreground"
          label={t("TOTAL_IM")}
          value={isLoading ? "-" : (data?.totalCount ?? "-")}
          link={`${basePath}/inbox`}
        />
        <StatTile
          icon={<Clock className="h-6 w-6" />}
          iconClassName="bg-warning text-warning-foreground"
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
