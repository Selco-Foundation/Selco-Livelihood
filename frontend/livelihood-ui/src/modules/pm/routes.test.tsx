import type { ComponentType } from "react";
import { createRootRoute } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PM_ROUTES } from "./constants/routes";
import { createPmModule } from "./routes";
import { PROJECT_MANAGER_ROLE } from "@/shared";

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    useModuleI18n: vi.fn(),
    useTranslate: () => ({ t: (key: string) => key }),
  };
});

import { useAuthStore, useModuleI18n } from "@/shared";

const rootRoute = createRootRoute();
const pmModule = createPmModule(rootRoute, rootRoute);
const [pmParentRoute, pmIndexRoute, myProjectsRoute, createProjectRoute, projectDetailsRoute, createInstallationPlanRoute] =
  pmModule.routes;

const basePath = "livelihood-ui";
const pmRootPath = `/${basePath}${PM_ROUTES.pmRoot}`;
const myProjectsPath = `/${basePath}${PM_ROUTES.myProjects}`;
const createProjectPath = `/${basePath}${PM_ROUTES.createProject}`;
const projectDetailsPath = `/${basePath}${PM_ROUTES.projectDetails}`;
const createInstallationPlanPath = `/${basePath}${PM_ROUTES.createInstallationPlan}`;
const homePath = `/${basePath}/employee`;

function pathOf(route: (typeof pmModule.routes)[number]): string | undefined {
  return (route.options as { path?: string }).path;
}

function captureRedirect(fn: () => unknown): { options?: { to?: string } } {
  try {
    fn();
    throw new Error("expected a redirect to be thrown");
  } catch (thrown) {
    return thrown as { options?: { to?: string } };
  }
}

describe("createPmModule routes", () => {
  it("builds every PM path under the configured context path", () => {
    expect(pathOf(pmIndexRoute)).toBe(pmRootPath);
    expect(pathOf(myProjectsRoute)).toBe(myProjectsPath);
    expect(pathOf(createProjectRoute)).toBe(createProjectPath);
    expect(pathOf(projectDetailsRoute)).toBe(projectDetailsPath);
    expect(pathOf(createInstallationPlanRoute)).toBe(createInstallationPlanPath);
  });

  describe("pmIndexRoute", () => {
    it("always redirects to My Projects", () => {
      const redirected = captureRedirect(() => (pmIndexRoute.options.beforeLoad as () => void)());
      expect(redirected.options?.to).toBe(myProjectsPath);
    });
  });

  describe("pmParentRoute.beforeLoad", () => {
    it("redirects home when the signed-in user isn't a Project Manager", () => {
      useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

      const redirected = captureRedirect(() => (pmParentRoute.options.beforeLoad as () => void)());

      expect(redirected.options?.to).toBe(homePath);
    });

    it("does not redirect a Project Manager", () => {
      useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });

      expect(() => (pmParentRoute.options.beforeLoad as () => void)()).not.toThrow();

      useAuthStore.setState({ user: null });
    });
  });

  describe("createProjectRoute.validateSearch", () => {
    const validate = createProjectRoute.options.validateSearch as (
      search: Record<string, unknown>,
    ) => { projectId?: string; step?: number };

    it("keeps a valid projectId and step", () => {
      expect(validate({ projectId: "p1", step: "2" })).toEqual({ projectId: "p1", step: 2 });
    });

    it("clamps an out-of-range step to undefined", () => {
      expect(validate({ step: "9" }).step).toBeUndefined();
      expect(validate({ step: "0" }).step).toBeUndefined();
    });

    it("defaults projectId to undefined when not a string", () => {
      expect(validate({}).projectId).toBeUndefined();
    });
  });

  describe("createInstallationPlanRoute.validateSearch", () => {
    const validate = createInstallationPlanRoute.options.validateSearch as (
      search: Record<string, unknown>,
    ) => { projectId: string; planId?: string; step?: number };

    it("defaults projectId to an empty string when missing", () => {
      expect(validate({}).projectId).toBe("");
    });

    it("keeps a valid planId and step (up to 4)", () => {
      expect(validate({ projectId: "p1", planId: "plan-1", step: "4" })).toEqual({
        projectId: "p1",
        planId: "plan-1",
        step: 4,
      });
    });

    it("rejects a step beyond 4", () => {
      expect(validate({ projectId: "p1", step: "5" }).step).toBeUndefined();
    });
  });

  describe("navItems", () => {
    it("builds the My Projects nav item scoped to the Project Manager role", () => {
      expect(pmModule.navItems).toEqual([
        expect.objectContaining({
          id: "pm-my-projects",
          label: "My Projects",
          labelKey: "ES_PM_MY_PROJECTS",
          to: myProjectsPath,
          matchPrefixes: [createProjectPath],
          roles: [PROJECT_MANAGER_ROLE],
        }),
      ]);
    });
  });
});

describe("PmModuleWrapper", () => {
  const PmModuleWrapper = pmParentRoute.options.component as ComponentType;

  it("renders the loading state while module translations are loading", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: true } as never);

    render(<PmModuleWrapper />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("reaches the Outlet branch once loading finishes (Outlet itself needs a mounted router)", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false } as never);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<PmModuleWrapper />)).toThrow();

    consoleError.mockRestore();
  });
});

describe("createPmModule", () => {
  it("returns the pm module id, order, and overview slots", () => {
    expect(pmModule.id).toBe("pm");
    expect(pmModule.order).toBe(0);
    expect(pmModule.overview?.kpis).toBeDefined();
    expect(pmModule.overview?.actions).toBeDefined();
  });
});
