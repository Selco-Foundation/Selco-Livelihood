import {
  contextPath,
  loadModules,
  translateOr,
  useAuthStore,
  useTranslate,
} from "@/shared";
import { Button, StatTile } from "@/ui";
import { Link } from "@tanstack/react-router";
import { Clock, FileText, Plus } from "lucide-react";
import { useEffect } from "react";
import { LanguageSwitcher } from "@/modules/core";
import { EndUserAssetsList } from "./EndUserAssetsList";
import { useEndUserAssets } from "../hooks/use-end-user-assets";
import { useImInboxSummary } from "../hooks/use-im-inbox-summary";
import { canCreateIncident, hasImAccess, isEndUser } from "../utils/access";

export function ImOverview() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const basePath = `/${contextPath()}/employee/im`;
  const { data, isLoading } = useImInboxSummary();
  const endUser = isEndUser(user?.roles);
  const { assets, isLoading: isAssetsLoading } = useEndUserAssets({ enabled: endUser });
  const canCreate = canCreateIncident(user?.roles);
  const displayName = user?.name ?? user?.userName ?? "";

  useEffect(() => {
    void loadModules(["rainmaker-im"]);
  }, []);

  if (!hasImAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl leading-9 font-semibold text-ink-950 lg:text-[32px] lg:leading-[48px]">
            {translateOr(t, "ES_IM_WELCOME", "Welcome")}
            {displayName ? <span className="hidden lg:inline">, {displayName}</span> : null}
          </h1>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-3 lg:flex">
              <LanguageSwitcher />
              {canCreate ? <span aria-hidden="true" className="h-8 w-px bg-border" /> : null}
            </div>
            {canCreate ? (
              <Button asChild size="sm" className="gap-1.5 rounded-full px-4 text-sm font-semibold lg:rounded-md">
                <Link to={`${basePath}/incident/create`}>
                  <Plus className="size-4" />
                  <span className="lg:hidden">{translateOr(t, "ES_IM_RAISE_TICKET_SHORT", "Raise Ticket")}</span>
                  <span className="hidden lg:inline">{translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise new ticket")}</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
        <p className="hidden text-sm leading-[21px] text-ink-600 lg:block">
          {endUser
            ? translateOr(
                t,
                "ES_IM_OVERVIEW_SUBTITLE",
                "Manage your issue resolution tickets and track your registered assets across the platform",
              )
            : translateOr(t, "ES_IM_OVERVIEW_SUBTITLE_SHORT", "Manage tickets")}
        </p>
      </div>
      <div className="flex gap-3 lg:flex-wrap lg:gap-4">
        <StatTile
          icon={<FileText className="h-6 w-6" />}
          iconClassName="bg-info text-info-foreground"
          label={translateOr(t, "TOTAL_IM", "Total")}
          value={isLoading ? "-" : (data?.totalCount ?? "-")}
          link={`${basePath}/inbox`}
        />
        <StatTile
          icon={<Clock className="h-6 w-6" />}
          iconClassName="bg-warning text-warning-foreground"
          label={translateOr(t, "TOTAL_NEARING_SLA", "Nearing SLA")}
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
