import {
  contextPath,
  loadModules,
  tenantId,
  useAuthStore,
  useTranslate,
} from "@/shared";
import { ModuleHomeCard } from "@/ui";
import { useEffect } from "react";
import { useImInboxSummary } from "../hooks/use-im-inbox-summary";
import { canCreateIncident, hasImAccess } from "../utils/access";

function ImIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="text-primary-foreground">
      <path d="M0 0h24v24H0z" fill="currentColor" opacity="0" />
      <path
        d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ImHomeCard() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const basePath = `/${contextPath()}/employee/im`;
  const { data, isLoading } = useImInboxSummary();

  useEffect(() => {
    void loadModules(["rainmaker-im"]);
  }, []);

  if (!hasImAccess(user?.roles)) {
    return null;
  }

  const roleLinks = canCreateIncident(user?.roles)
    ? [
        {
          label: t("ES_IM_NEW_INCIDENT"),
          link: `${basePath}/incident/create`,
        },
      ]
    : [];

  return (
    <ModuleHomeCard
      icon={<ImIcon />}
      moduleName={t("ES_IM_INCIDENTS")}
      kpis={[
        {
          count: isLoading ? "-" : data?.totalCount,
          label: t("TOTAL_IM"),
          link: `${basePath}/inbox`,
        },
        {
          count: data?.nearingSlaCount ?? "-",
          label: t("TOTAL_NEARING_SLA"),
          link: `${basePath}/inbox?nearing=1`,
        },
      ]}
      links={[
        { label: t("ES_IM_INBOX"), link: `${basePath}/inbox` },
        ...roleLinks,
      ]}
    />
  );
}
