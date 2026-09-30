import type { ComponentType } from "react";
import { createRootRoute } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImDetails, ImKpis, ImOverviewActions } from "./components/ImOverview";
import { IM_ROUTES } from "./constants/routes";
import { createImModule, createImRoutes } from "./routes";
import { IM_ROLES } from "./utils/access";

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
const { routes, navItems } = createImRoutes(rootRoute, rootRoute);
const [imParentRoute, imIndexRoute, inboxRoute, createIncidentRoute, complaintDetailsRoute] =
  routes;

const imRootPath = `/livelihood-ui${IM_ROUTES.imRoot}`;
const inboxPath = `/livelihood-ui${IM_ROUTES.inbox}`;
const createPath = `/livelihood-ui${IM_ROUTES.createIncident}`;
const complaintDetailsPath = `/livelihood-ui${IM_ROUTES.complaintDetails}/$incidentId/$tenantId`;

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

describe("createImRoutes", () => {
  it("builds the im-root, inbox, create-incident, and complaint-details paths", () => {
    expect(pathOf(imIndexRoute)).toBe(imRootPath);
    expect(pathOf(inboxRoute)).toBe(inboxPath);
    expect(pathOf(createIncidentRoute)).toBe(createPath);
    expect(pathOf(complaintDetailsRoute)).toBe(complaintDetailsPath);
  });

  describe("imIndexRoute", () => {
    it("always redirects to the inbox path", () => {
      const redirected = captureRedirect(() => (imIndexRoute.options.beforeLoad as () => void)());
      expect(redirected.options?.to).toBe(inboxPath);
    });
  });

  describe("inboxRoute validateSearch", () => {
    const validateSearch = inboxRoute.options.validateSearch as (
      search: Record<string, unknown>,
    ) => {
      filter?: unknown;
      pageOffset: number;
      pageSize: number;
      nearing?: string;
    };

    it("defaults pageOffset, pageSize, filter, and nearing when absent", () => {
      expect(validateSearch({})).toEqual({
        filter: undefined,
        pageOffset: 0,
        pageSize: 10,
        nearing: undefined,
      });
    });

    it("passes through an object filter as-is", () => {
      const filter = { status: ["OPEN"] };
      expect(validateSearch({ filter }).filter).toEqual(filter);
    });

    it("drops a non-object filter", () => {
      expect(validateSearch({ filter: "not-an-object" }).filter).toBeUndefined();
    });

    it("coerces pageOffset and pageSize to finite numbers, falling back on invalid input", () => {
      expect(validateSearch({ pageOffset: "5", pageSize: "20" })).toMatchObject({
        pageOffset: 5,
        pageSize: 20,
      });
      expect(validateSearch({ pageOffset: "not-a-number", pageSize: NaN })).toMatchObject({
        pageOffset: 0,
        pageSize: 10,
      });
    });

    it("stringifies a defined nearing value and leaves it undefined otherwise", () => {
      expect(validateSearch({ nearing: 1 }).nearing).toBe("1");
      expect(validateSearch({ nearing: null }).nearing).toBeUndefined();
      expect(validateSearch({ nearing: undefined }).nearing).toBeUndefined();
    });
  });

  describe("navItems", () => {
    it("builds the inbox nav item with IM_ROLES and the complaint-details match prefix", () => {
      expect(navItems).toEqual([
        expect.objectContaining({
          id: "im-inbox",
          label: "Inbox",
          labelKey: "ES_IM_INBOX",
          to: inboxPath,
          matchPrefixes: [`/livelihood-ui${IM_ROUTES.complaintDetails}`],
          roles: [...IM_ROLES],
        }),
      ]);
    });
  });
});

describe("ImModuleWrapper", () => {
  const ImModuleWrapper = imParentRoute.options.component as ComponentType;

  it("renders the loading state while module translations are loading", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: true });

    render(<ImModuleWrapper />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("attempts to render an Outlet once loading finishes", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ImModuleWrapper />)).toThrow();

    consoleError.mockRestore();
  });

  it("does not render the loading text once loading finishes", () => {
    vi.mocked(useModuleI18n).mockReturnValue({ isLoading: false });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<ImModuleWrapper />);
    } catch {
      // Outlet throws outside a router provider; see test above.
    }
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});

describe("createImModule", () => {
  const imModule = createImModule(rootRoute, rootRoute);

  it("returns the im module id, order, and overview slots", () => {
    expect(imModule.id).toBe("im");
    expect(imModule.order).toBe(1);
    expect(imModule.overview).toEqual({
      kpis: ImKpis,
      details: ImDetails,
      actions: ImOverviewActions,
    });
  });

  it("delegates routes and navItems to createImRoutes", () => {
    expect(imModule.routes).toHaveLength(routes.length);
    expect(imModule.routes.map((route) => pathOf(route))).toEqual(routes.map((route) => pathOf(route)));
    expect(imModule.navItems).toEqual(navItems);
  });
});
