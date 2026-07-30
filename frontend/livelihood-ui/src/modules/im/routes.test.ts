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

describe("imIndexRoute", () => {
  it("always redirects to the inbox path", () => {
    const redirected = captureRedirect(() => (imIndexRoute.options.beforeLoad as () => void)());
    expect(redirected.options?.to).toBe("/livelihood-ui/employee/im/inbox");
  });
});

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
