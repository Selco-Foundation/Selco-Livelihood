import {
  contextPath,
  isProjectManager,
  PROJECT_MANAGER_ROLE,
  translateOr,
  useAuthStore,
  useModuleI18n,
  useTranslate,
} from "@/shared";
import type { AnyRoute } from "@tanstack/react-router";
import { createRoute, Outlet, redirect } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { PmKpis } from "./components/PmKpis";
import { PmOverview } from "./components/PmOverview";
import { PM_ROUTES } from "./constants/routes";
import { CreateInstallationPlanPage } from "./pages/employee/CreateInstallationPlanPage";
import { CreateProjectPage } from "./pages/employee/CreateProjectPage";
import { MyProjectsPage } from "./pages/employee/MyProjectsPage";
import { ProjectDetailsPage } from "./pages/employee/ProjectDetailsPage";

export interface CreateProjectRouteSearch {
  projectId?: string;
  step?: number;
}

export interface ProjectDetailsRouteSearch {
  projectId: string;
}

export interface InstallationPlanRouteSearch {
  projectId: string;
  planId?: string;
  step?: number;
}

function toStepNumber(value: unknown, maxStep: number): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= maxStep ? parsed : undefined;
}

/**
 * Parent route component for all PM pages.
 * Blocks rendering until the rainmaker-pm translation module is loaded
 * (either from localStorage cache or fetched from the API on first visit).
 */
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

function createPmRoutes(employeeLayoutRoute: AnyRoute) {
  const basePath = contextPath();
  const pmRootPath = `/${basePath}${PM_ROUTES.pmRoot}`;
  const myProjectsPath = `/${basePath}${PM_ROUTES.myProjects}`;
  const createProjectPath = `/${basePath}${PM_ROUTES.createProject}`;
  const projectDetailsPath = `/${basePath}${PM_ROUTES.projectDetails}`;
  const createInstallationPlanPath = `/${basePath}${PM_ROUTES.createInstallationPlan}`;
  const homePath = `/${basePath}/employee`;

  // Parent route — loads rainmaker-pm translations and gates the whole PM
  // subtree behind the PROJECT_MANAGER role before any PM page renders.
  const pmParentRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    id: "pm-module",
    component: PmModuleWrapper,
    beforeLoad: () => {
      const user = useAuthStore.getState().user;
      if (!isProjectManager(user?.roles)) {
        throw redirect({ to: homePath });
      }
    },
  });

  const pmIndexRoute = createRoute({
    getParentRoute: () => pmParentRoute,
    path: pmRootPath,
    beforeLoad: () => {
      throw redirect({ to: myProjectsPath });
    },
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
      step: toStepNumber(search.step, 3),
    }),
    component: CreateProjectPage,
  });

  const projectDetailsRoute = createRoute({
    getParentRoute: () => pmParentRoute,
    path: projectDetailsPath,
    validateSearch: (search: Record<string, unknown>): ProjectDetailsRouteSearch => ({
      projectId: typeof search.projectId === "string" ? search.projectId : "",
    }),
    component: ProjectDetailsPage,
  });

  const createInstallationPlanRoute = createRoute({
    getParentRoute: () => pmParentRoute,
    path: createInstallationPlanPath,
    validateSearch: (search: Record<string, unknown>): InstallationPlanRouteSearch => ({
      projectId: typeof search.projectId === "string" ? search.projectId : "",
      planId: typeof search.planId === "string" ? search.planId : undefined,
      step: toStepNumber(search.step, 4),
    }),
    component: CreateInstallationPlanPage,
  });

  return {
    routes: [
      pmParentRoute,
      pmIndexRoute,
      myProjectsRoute,
      createProjectRoute,
      projectDetailsRoute,
      createInstallationPlanRoute,
    ],
    navItems: [
      {
        id: "pm-my-projects",
        label: "My Projects",
        labelKey: "ES_PM_MY_PROJECTS",
        to: myProjectsPath,
        icon: FolderKanban,
        matchPrefixes: [createProjectPath],
        roles: [PROJECT_MANAGER_ROLE],
      },
    ],
  };
}

export function createPmModule(_rootRoute: AnyRoute, employeeLayoutRoute: AnyRoute) {
  const { routes, navItems } = createPmRoutes(employeeLayoutRoute);

  return {
    id: "pm",
    order: 0,
    routes,
    navItems,
    overview: { kpis: PmKpis, actions: PmOverview },
  };
}
