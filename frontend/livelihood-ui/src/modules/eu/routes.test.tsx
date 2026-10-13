import { createRootRoute, isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { EU_ROUTES } from "./constants/routes";
import { createEuRoutes } from "./routes";

// Route-definition tests: build a real (unattached) createRootRoute() to
// satisfy createEuRoutes's parent-route parameters, then exercise the plain
// functions attached to each route's `.options.beforeLoad` directly — no
// component rendering or router mounting needed.
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useModuleI18n: vi.fn(), useTranslate: () => ({ t: (key: string) => key }) };
});

const rootRoute = createRootRoute();
const { routes } = createEuRoutes(rootRoute, rootRoute);
const [, euIndexRoute] = routes;

const euRootPath = `/livelihood-ui${EU_ROUTES.euRoot}`;
const facilitiesPath = `/livelihood-ui${EU_ROUTES.facilities}`;

function captureRedirect(fn: () => unknown): { options?: { to?: string } } {
  try {
    fn();
    throw new Error("expected a redirect to be thrown");
  } catch (thrown) {
    return thrown as { options?: { to?: string } };
  }
}

function captureNotFound(fn: () => unknown): unknown {
  try {
    fn();
    throw new Error("expected notFound() to be thrown");
  } catch (thrown) {
    return thrown;
  }
}

type BeforeLoad = (ctx: { location: { pathname: string } }) => void;

describe("createEuRoutes", () => {
  describe("euIndexRoute", () => {
    it("redirects to the facilities list for an exact match", () => {
      const redirected = captureRedirect(() =>
        (euIndexRoute.options.beforeLoad as BeforeLoad)({ location: { pathname: euRootPath } }),
      );
      expect(redirected.options?.to).toBe(facilitiesPath);
    });

    it("falls through to not-found instead of redirecting for an unmatched sub-path", () => {
      const thrown = captureNotFound(() =>
        (euIndexRoute.options.beforeLoad as BeforeLoad)({
          location: { pathname: `${euRootPath}/does-not-exist` },
        }),
      );
      expect(isNotFound(thrown)).toBe(true);
    });
  });
});
