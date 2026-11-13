import { createRootRoute, isNotFound } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AMC_ROUTES } from "./constants/routes";
import { AmcModuleWrapper, createAmcModule, createAmcRoutes } from "./routes";
import { AMC_REVIEWER_ROLES } from "./utils/access";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    useModuleI18n: vi.fn(),
    useTranslate: () => ({ t: (key: string) => key }),
  };
});

import { employeeHomePath, useAuthStore, useModuleI18n } from "@/shared";

const rootRoute = createRootRoute();
const { routes, navItems } = createAmcRoutes(rootRoute);
const [amcParentRoute, amcIndexRoute, reportsRoute, reportDetailRoute, projectsRoute, projectReportsRoute] = routes;

const amcRootPath = `/livelihood-ui${AMC_ROUTES.amcRoot}`;
const reportsPath = `/livelihood-ui${AMC_ROUTES.reports}`;
const projectsPath = `/livelihood-ui${AMC_ROUTES.projects}`;

function pathOf(route: (typeof routes)[number]): string | undefined {
  return (route.options as { path?: string }).path;
}

function captureThrown(fn: () => unknown): { options?: { to?: string } } {
  try {
    fn();
    throw new Error("expected a throw");
  } catch (thrown) {
    return thrown as { options?: { to?: string } };
  }
}

type BeforeLoad = (ctx: { location: { pathname: string } }) => void;

describe("createAmcRoutes", () => {
  it("builds the reports, report detail, projects and project reports paths", () => {
    expect(pathOf(amcIndexRoute)).toBe(amcRootPath);
    expect(pathOf(reportsRoute)).toBe(reportsPath);
    expect(pathOf(reportDetailRoute)).toBe(`${reportsPath}/$reportId`);
    expect(pathOf(projectsRoute)).toBe(projectsPath);
    expect(pathOf(projectReportsRoute)).toBe(`${projectsPath}/$projectId`);
  });

  it("redirects the module root to the reports list, and anything else under it to not-found", () => {
    const redirected = captureThrown(() =>
      (amcIndexRoute.options.beforeLoad as BeforeLoad)({ location: { pathname: amcRootPath } }),
    );
    expect(redirected.options?.to).toBe(reportsPath);

    const thrown = captureThrown(() =>
      (amcIndexRoute.options.beforeLoad as BeforeLoad)({ location: { pathname: `${amcRootPath}/nope` } }),
    );
    expect(isNotFound(thrown)).toBe(true);
  });

  it("redirects users without the AMC reviewer role to Overview", () => {
    useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });

    const redirected = captureThrown(() => (amcParentRoute.options.beforeLoad as () => void)());

    expect(redirected.options?.to).toBe(employeeHomePath());
    useAuthStore.setState({ user: null });
  });

  it("lets an AMC reviewer through", () => {
    useAuthStore.setState({ user: { roles: [{ code: "AMC_REVIEWER" }] } });

    expect(() => (amcParentRoute.options.beforeLoad as () => void)()).not.toThrow();
    useAuthStore.setState({ user: null });
  });

  it("defaults the reports tab to pending and keeps auto", () => {
    const validate = reportsRoute.options.validateSearch as (search: Record<string, unknown>) => { tab?: string };

    expect(validate({})).toEqual({ tab: "pending" });
    expect(validate({ tab: "auto" })).toEqual({ tab: "auto" });
    expect(validate({ tab: "other" })).toEqual({ tab: "pending" });
  });

  it("scopes both nav items to the AMC reviewer role", () => {
    expect(navItems).toEqual([
      expect.objectContaining({ id: "amc-reports", to: reportsPath, roles: [...AMC_REVIEWER_ROLES] }),
      expect.objectContaining({ id: "amc-projects", to: projectsPath, roles: [...AMC_REVIEWER_ROLES] }),
    ]);
  });

  it("returns the amc module definition", () => {
    expect(createAmcModule(rootRoute, rootRoute)).toMatchObject({ id: "amc", order: 5 });
  });
});

describe("AmcModuleWrapper", () => {
  it("renders the loading state while module translations are loading", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: true });

    render(<AmcModuleWrapper />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("attempts to render an Outlet once loading finishes", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<AmcModuleWrapper />)).toThrow();
    consoleError.mockRestore();
  });
});
