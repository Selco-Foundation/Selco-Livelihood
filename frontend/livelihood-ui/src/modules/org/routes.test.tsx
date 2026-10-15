import { createRootRoute, isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { ORG_ROUTES } from "./constants/routes";
import { createOrgRoutes } from "./routes";
import { ORG_POC_ROLES, ORG_SUPER_ADMIN_ROLES } from "./utils/access";

// Route-definition tests: build a real (unattached) createRootRoute() to
// satisfy createOrgRoutes's parent-route parameters, then exercise the plain
// functions attached to each route's `.options.beforeLoad` directly — no
// component rendering or router mounting needed.
vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useModuleI18n: vi.fn(), useTranslate: () => ({ t: (key: string) => key }) };
});

import { employeeHomePath, useAuthStore } from "@/shared";

const rootRoute = createRootRoute();
const { routes } = createOrgRoutes(rootRoute, rootRoute);
const [orgParentRoute, orgIndexRoute] = routes;

const orgRootPath = `/livelihood-ui${ORG_ROUTES.orgRoot}`;
const platformsPath = `/livelihood-ui${ORG_ROUTES.platforms}`;

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

describe("createOrgRoutes", () => {
  describe("orgIndexRoute", () => {
    it("redirects to the platforms list for an exact match", () => {
      const redirected = captureRedirect(() =>
        (orgIndexRoute.options.beforeLoad as BeforeLoad)({ location: { pathname: orgRootPath } }),
      );
      expect(redirected.options?.to).toBe(platformsPath);
    });

    it("falls through to not-found instead of redirecting for an unmatched sub-path", () => {
      const thrown = captureNotFound(() =>
        (orgIndexRoute.options.beforeLoad as BeforeLoad)({
          location: { pathname: `${orgRootPath}/does-not-exist` },
        }),
      );
      expect(isNotFound(thrown)).toBe(true);
    });
  });

  describe("orgParentRoute.beforeLoad", () => {
    it("redirects to Overview when the signed-in user has no org role", () => {
      useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

      const redirected = captureRedirect(() => (orgParentRoute.options.beforeLoad as () => void)());

      expect(redirected.options?.to).toBe(employeeHomePath());

      useAuthStore.setState({ user: null });
    });

    it("does not redirect a super-admin-only user", () => {
      useAuthStore.setState({ user: { roles: [{ code: ORG_SUPER_ADMIN_ROLES[0] }] } });

      expect(() => (orgParentRoute.options.beforeLoad as () => void)()).not.toThrow();

      useAuthStore.setState({ user: null });
    });

    it("does not redirect a POC-only user", () => {
      useAuthStore.setState({ user: { roles: [{ code: ORG_POC_ROLES[0] }] } });

      expect(() => (orgParentRoute.options.beforeLoad as () => void)()).not.toThrow();

      useAuthStore.setState({ user: null });
    });
  });
});
