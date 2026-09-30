import type { ComponentType } from "react";
import { createRootRoute } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IrKpis } from "./components/IrOverview";
import { IR_ROUTES } from "./constants/routes";
import { createIrModule, createIrRoutes } from "./routes";
import { IR_ROLES } from "./utils/access";

// Route-definition tests: build a real (unattached) createRootRoute() to
// satisfy createIrRoutes's parent-route parameters, then exercise the plain
// functions/values attached to each route's `.options` directly — no
// component rendering or router mounting needed, since none of that logic
// touches React rendering. IrModuleWrapper (the parent route's `component`)
// is the exception below, since it has real conditional JSX.
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    useModuleI18n: vi.fn(),
    useTranslate: () => ({ t: (key: string) => key }),
  };
});

import { useModuleI18n } from "@/shared";

const rootRoute = createRootRoute();
const { routes, navItems } = createIrRoutes(rootRoute, rootRoute);
const [irParentRoute, irIndexRoute, installationPlansRoute, activitiesRoute, activityReviewRoute] =
  routes;

const irRootPath = `/livelihood-ui${IR_ROUTES.irRoot}`;
const installationPlansPath = `/livelihood-ui${IR_ROUTES.installationPlans}`;
const activitiesPath = `${installationPlansPath}/$planId/activities`;
const activityReviewPath = `${activitiesPath}/$activityId/review`;

// The routes array's inferred element type is a union across all five route
// variants, so TS won't narrow `.options.path` per-element without a cast.
function pathOf(route: (typeof routes)[number]): string | undefined {
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

describe("createIrRoutes", () => {
  it("builds the installation-plans, activities, and activity-review paths", () => {
    expect(pathOf(irIndexRoute)).toBe(irRootPath);
    expect(pathOf(installationPlansRoute)).toBe(installationPlansPath);
    expect(pathOf(activitiesRoute)).toBe(activitiesPath);
    expect(pathOf(activityReviewRoute)).toBe(activityReviewPath);
  });

  describe("irIndexRoute", () => {
    it("always redirects to the installation-plans path", () => {
      const redirected = captureRedirect(() => (irIndexRoute.options.beforeLoad as () => void)());
      expect(redirected.options?.to).toBe(installationPlansPath);
    });
  });

  describe("navItems", () => {
    it("builds the installation-plans nav item with IR_ROLES", () => {
      expect(navItems).toEqual([
        expect.objectContaining({
          id: "ir-installation-plans",
          label: "Installation Plans",
          labelKey: "ES_IR_INSTALLATION_PLANS",
          to: installationPlansPath,
          roles: [...IR_ROLES],
        }),
      ]);
    });
  });
});

describe("IrModuleWrapper", () => {
  const IrModuleWrapper = irParentRoute.options.component as ComponentType;

  it("renders the loading state while module translations are loading", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: true });

    render(<IrModuleWrapper />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // Once loading finishes, IrModuleWrapper renders <Outlet />. Outlet reads
  // router context via useRouter(), which is unavailable outside a mounted
  // RouterProvider, so rendering standalone throws — this still confirms the
  // component reaches the <Outlet /> branch rather than the loading branch.
  it("attempts to render an Outlet once loading finishes", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<IrModuleWrapper />)).toThrow();

    consoleError.mockRestore();
  });

  it("does not render the loading text once loading finishes", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<IrModuleWrapper />);
    } catch {
      // Outlet throws outside a router provider; see test above.
    }
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});

describe("createIrModule", () => {
  const irModule = createIrModule(rootRoute, rootRoute);

  it("returns the ir module id, order, and overview kpis", () => {
    expect(irModule.id).toBe("ir");
    expect(irModule.order).toBe(2);
    expect(irModule.overview.kpis).toBe(IrKpis);
  });

  it("delegates routes and navItems to createIrRoutes", () => {
    expect(irModule.routes).toHaveLength(routes.length);
    expect(irModule.routes.map((route) => pathOf(route))).toEqual(routes.map((route) => pathOf(route)));
    expect(irModule.navItems).toEqual(navItems);
  });
});
