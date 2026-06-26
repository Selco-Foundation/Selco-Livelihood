import { contextPath, employeeHomePath, useAuthStore } from "@/shared";
import { createRoute, redirect } from "@tanstack/react-router";
import type { AnyRoute } from "@tanstack/react-router";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./pages/employee/LoginPage";
import { HomePage } from "./pages/employee/HomePage";
import { CORE_ROUTES } from "./constants/routes";

export function createCoreRoutes(rootRoute: AnyRoute) {
  const basePath = contextPath();
  const employeeHome = `/${basePath}${CORE_ROUTES.employeeHome}`;
  const employeeLogin = `/${basePath}${CORE_ROUTES.employeeLogin}`;

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: () => {
      throw redirect({ to: employeeHome });
    },
  });

  const employeeLoginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: employeeLogin,
    validateSearch: (search: Record<string, unknown>) => ({
      from: typeof search.from === "string" ? search.from : undefined,
    }),
    beforeLoad: () => {
      if (useAuthStore.getState().isAuthenticated) {
        throw redirect({ to: employeeHome });
      }
    },
    component: LoginPage,
  });

  const employeeLayoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "employee-layout",
    beforeLoad: ({ location }) => {
      if (!useAuthStore.getState().isAuthenticated) {
        throw redirect({
          to: employeeLogin,
          search: {
            from: location.href,
          },
        });
      }
    },
    component: () => <AppShell />,
  });

  const employeeHomeRoute = createRoute({
    getParentRoute: () => employeeLayoutRoute,
    path: employeeHome,
    component: HomePage,
  });

  return {
    routes: [indexRoute, employeeLoginRoute, employeeLayoutRoute, employeeHomeRoute],
    navItems: [],
    employeeLayoutRoute,
  };
}
