import {
  contextPath,
  employeeHomePath,
  isProjectManager,
  translateOr,
  useAuthStore,
  useModuleI18n,
  useTranslate,
} from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { PmOverview } from "./components/PmOverview";
import { PM_ROUTES } from "./constants/routes";
import { CreateProjectPage } from "./pages/employee/CreateProjectPage";
import { MyProjectsPage } from "./pages/employee/MyProjectsPage";

export interface CreateProjectRouteSearch {
  projectId?: string;
  step?: number;
}

function PmModuleWrapper() {
  const { isLoading } = useModuleI18n("pm");
  const { t } = useTranslate();

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        {translateOr(t, "CORE_COMMON_LOADING", "Loading...")}
      </div>
    );
  }
  return <Outlet />;
}

export function createPmRoutes(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const myProjectsPath = `/${basePath}${PM_ROUTES.myProjects}`;
  const createProjectPath = `/${basePath}${PM_ROUTES.createProject}`;

  const pmParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "pm-module",
    beforeLoad: () => {
      const user = useAuthStore.getState().user;
      if (!isProjectManager(user?.roles)) {
        throw redirect({ to: employeeHomePath() });
      }
    },
    component: PmModuleWrapper,
  });

  const myProjectsRoute = createRoute({
    getParentRoute: () => pmParentRoute,
    path: myProjectsPath,
    component: MyProjectsPage,
  });

  const createProjectRoute = createRoute({
    getParentRoute: () => pmParentRoute,
    path: createProjectPath,
    validateSearch: (search: Record<string, unknown>): CreateProjectRouteSearch => ({
      projectId: typeof search.projectId === "string" ? search.projectId : undefined,
      step:
        typeof search.step === "number"
          ? search.step
          : typeof search.step === "string"
            ? Number(search.step) || undefined
            : undefined,
    }),
    component: CreateProjectPage,
  });

  return {
    routes: [pmParentRoute, myProjectsRoute, createProjectRoute],
    navItems: [],
  };
}

export function createPmModule(rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createPmRoutes(rootRoute, employeeLayoutRoute);
  return { id: "pm", order: 0, routes, navItems, overview: PmOverview };
}
