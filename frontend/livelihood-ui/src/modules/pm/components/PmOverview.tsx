import { contextPath, isProjectManager, translateOr, useAuthStore, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { Link } from "@tanstack/react-router";
import { FolderPlus, FolderKanban } from "lucide-react";
import { LanguageSwitcher } from "@/modules/core";
import { PM_ROUTES } from "../constants/routes";

function ActionCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: typeof FolderPlus;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "livelihood-card flex min-w-0 flex-1 items-start gap-3 p-5 transition-opacity hover:opacity-90 lg:max-w-sm",
      )}
    >
      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function PmOverview() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const basePath = `/${contextPath()}`;

  if (!isProjectManager(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink-950">
          {translateOr(t, "PM_COMMON_PROJECTS", "Projects")}
        </h2>
        <LanguageSwitcher />
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <ActionCard
          to={`${basePath}${PM_ROUTES.createProject}`}
          icon={FolderPlus}
          title={translateOr(t, "PM_ACTION_CREATE_PROJECT", "New Project")}
          description={translateOr(
            t,
            "PM_ACTION_CREATE_PROJECT_DESC",
            "Set up a new project and its installation scope",
          )}
        />
        <ActionCard
          to={`${basePath}${PM_ROUTES.myProjects}`}
          icon={FolderKanban}
          title={translateOr(t, "PM_LABEL_MY_PROJECTS", "My Projects")}
          description={translateOr(
            t,
            "PM_LABEL_MY_PROJECTS_DESC",
            "View and resume your existing projects",
          )}
        />
      </div>
    </div>
  );
}
