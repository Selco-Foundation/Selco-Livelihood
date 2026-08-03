/**
 * Unit tests for `createImRoutes` (src/modules/im/routes.tsx).
 *
 * `createImRoutes` builds the TanStack Router route objects and nav items for
 * the Incident Management (IM) module: an index route that redirects to the
 * inbox, the inbox route itself (with its `validateSearch` query-param
 * normalizer), a create-incident route, and a complaint-details route.
 *
 * Testing approach: no component rendering or providers are needed here —
 * these are pure route-definition tests. We build a real (unattached)
 * `createRootRoute()` to satisfy `createImRoutes`'s parent-route parameters,
 * then exercise the plain functions attached to each route's `.options`
 * (`beforeLoad`, `validateSearch`) directly, without mounting a router or DOM.
 * This avoids needing i18n/query-client/router wrappers since none of the
 * logic under test touches React rendering.
 */
import { createRootRoute } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { createImRoutes } from "./routes";

const rootRoute = createRootRoute();
const { routes, navItems } = createImRoutes(rootRoute, rootRoute);

// createImRoutes returns routes in this fixed order (see routes.tsx); see the
// core routes.test.ts comment for why `.options` is read directly rather than
// top-level `.id`/`.path` (those only resolve once attached to a built tree).
const [, imIndexRoute, inboxRoute] = routes;

function captureRedirect(fn: () => unknown): { options?: { to?: string } } {
  try {
    fn();
    throw new Error("expected a redirect to be thrown");
  } catch (thrown) {
    return thrown as { options?: { to?: string } };
  }
}

// imIndexRoute has no path segment of its own beyond the IM root — its sole
// job is a `beforeLoad` that unconditionally throws a `redirect` to the inbox
// path, so visiting the bare IM root always lands the user on the inbox.
describe("imIndexRoute", () => {
  it("always redirects to the inbox path", () => {
    const redirected = captureRedirect(() => (imIndexRoute.options.beforeLoad as () => void)());
    expect(redirected.options?.to).toBe("/livelihood-ui/employee/im/inbox");
  });
});

// inboxRoute's `validateSearch` normalizes the raw URL search-param object
// into a typed `InboxRouteSearch`: it coerces pageOffset/pageSize through
// `toFiniteNumber` (falling back to 0/10 when the value can't be parsed to a
// finite number, e.g. non-numeric strings or Infinity), passes an object
// `filter` through unchanged (relying on the router's default JSON codec
// rather than manual stringify/parse), and stringifies `nearing` unless it is
// null/undefined.
describe("inboxRoute validateSearch", () => {
  it("defaults pageOffset/pageSize when absent", () => {
    expect(inboxRoute.options.validateSearch!({})).toEqual({
      filter: undefined,
      pageOffset: 0,
      pageSize: 10,
      nearing: undefined,
    });
  });

  it("coerces numeric-string pageOffset/pageSize to numbers", () => {
    const result = inboxRoute.options.validateSearch!({ pageOffset: "20", pageSize: "50" });
    expect(result.pageOffset).toBe(20);
    expect(result.pageSize).toBe(50);
  });

  // `toFiniteNumber` uses `Number.isFinite`, so a non-numeric string (which
  // parses to NaN) and Infinity both fail the finite check and must fall
  // back to the defaults rather than propagating NaN/Infinity into pagination.
  it("falls back to the default when pageOffset/pageSize isn't finite", () => {
    const result = inboxRoute.options.validateSearch!({
      pageOffset: "not-a-number",
      pageSize: Number.POSITIVE_INFINITY,
    });
    expect(result.pageOffset).toBe(0);
    expect(result.pageSize).toBe(10);
  });

  it("passes through an object filter as-is", () => {
    const filter = { pgrQuery: { state: "S1" } };
    const result = inboxRoute.options.validateSearch!({ filter });
    expect(result.filter).toEqual(filter);
  });

  it("discards a non-object filter value", () => {
    const result = inboxRoute.options.validateSearch!({ filter: "not-an-object" });
    expect(result.filter).toBeUndefined();
  });

  it("stringifies a present nearing value", () => {
    const result = inboxRoute.options.validateSearch!({ nearing: true });
    expect(result.nearing).toBe("true");
  });

  it("defaults nearing to undefined when null/undefined", () => {
    expect(inboxRoute.options.validateSearch!({ nearing: null }).nearing).toBeUndefined();
    expect(inboxRoute.options.validateSearch!({}).nearing).toBeUndefined();
  });
});

// createImRoutes also returns the module's nav item(s) for the sidebar. The
// inbox nav item includes `matchPrefixes` for the complaint-details path so
// the nav highlights "Inbox" as active while viewing a complaint's details
// (a route with no nav item of its own).
describe("navItems", () => {
  it("builds the inbox nav item with the complaint-details match prefix", () => {
    expect(navItems).toEqual([
      expect.objectContaining({
        id: "im-inbox",
        to: "/livelihood-ui/employee/im/inbox",
        matchPrefixes: ["/livelihood-ui/employee/im/complaint/details"],
      }),
    ]);
  });
});
