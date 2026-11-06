import { isProjectManager, translateOr, useAuthStore, useTranslate } from "@/shared";
import { StatTile } from "@/ui";
import { FolderKanban } from "lucide-react";
import { useProjectsSearch } from "../hooks/use-projects-search";
import { pmMyProjectsPath } from "../utils/paths";

export function PmKpis() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { data, isLoading } = useProjectsSearch({ limit: 0, offset: 0 });

  if (!isProjectManager(user?.roles)) {
    return null;
  }

  return (
    <StatTile
      icon={<FolderKanban className="h-6 w-6" />}
      iconClassName="bg-info text-info-foreground"
      label={translateOr(t, "ES_PM_TOTAL_PROJECTS", "Total Projects")}
      value={isLoading ? "-" : String(data?.totalCount ?? 0)}
      link={pmMyProjectsPath()}
    />
  );
}
