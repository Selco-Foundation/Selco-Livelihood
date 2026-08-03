/**
 * Unit tests for src/modules/im/constants/routes.ts
 *
 * This file exports a single runtime value, `IM_ROUTES` — a plain `as const`
 * object mapping IM (Incident Management) route keys to their literal path
 * strings. There are no functions, no branches, and no conditional logic to
 * exercise; the only meaningful regression risk is the path strings
 * themselves silently drifting (e.g. a typo, a trailing slash, or a key being
 * renamed/removed) since these strings are string-concatenated directly into
 * route paths in src/modules/im/routes.tsx (e.g.
 * `` `/${basePath}${IM_ROUTES.inbox}` ``, and complaintDetails additionally
 * has `/$incidentId/$tenantId` appended) and consumed by page components
 * (ComplaintDetailsPage.tsx, CreateIncidentPage.tsx) and other modules via
 * src/modules/im/index.ts. A change here would not be caught by TypeScript
 * (the literal values are still valid strings) but would break real
 * navigation to the IM inbox, incident creation, and complaint details
 * screens at runtime.
 *
 * Testing approach: no mocking, no provider wrapper, and no rendering is
 * needed — the module is imported directly and its exported object is
 * asserted against exact expected values and shape. This keeps the test a
 * genuine regression check on the literal contents rather than a placeholder.
 */
import { describe, expect, it } from "vitest";
import { IM_ROUTES } from "./routes";

// IM_ROUTES is the full set of IM module route path fragments used
// throughout src/modules/im/routes.tsx to build the app's absolute routes
// (each is concatenated onto a runtime-configured basePath). It expects no
// input — it is a static, frozen-by-convention (`as const`) object.
describe("IM_ROUTES", () => {
  it("exposes the exact route path strings expected by src/modules/im/routes.tsx", () => {
    // Asserting the full object in one go (rather than key-by-key) catches
    // both value drift on existing keys and accidental addition/removal of
    // keys in a single assertion.
    expect(IM_ROUTES).toEqual({
      imRoot: "/employee/im",
      inbox: "/employee/im/inbox",
      createIncident: "/employee/im/incident/create",
      complaintDetails: "/employee/im/complaint/details",
    });
  });

  it("exposes exactly the four documented route keys, no more and no fewer", () => {
    // Guards against a key being silently renamed or an extra key being
    // added without an accompanying update to this test / the consumers.
    expect(Object.keys(IM_ROUTES).sort()).toEqual(
      ["imRoot", "inbox", "createIncident", "complaintDetails"].sort(),
    );
  });

  it("nests every sub-route under the imRoot root path", () => {
    // Business rule: imRoot ("/employee/im") is the root all other IM
    // routes hang off of. If a future edit accidentally detaches a route
    // from this root (e.g. drops the "/employee/im" prefix), navigation
    // built from `basePath + IM_ROUTES.x` in routes.tsx would silently
    // point outside the IM section of the app.
    const { imRoot, ...rest } = IM_ROUTES;

    for (const path of Object.values(rest)) {
      expect(path.startsWith(`${imRoot}/`)).toBe(true);
    }
  });

  it("does not have any trailing slashes on any route", () => {
    // A trailing slash would produce double slashes when concatenated as
    // `/${basePath}${IM_ROUTES.x}` in routes.tsx.
    for (const path of Object.values(IM_ROUTES)) {
      expect(path.endsWith("/")).toBe(false);
    }
  });
});
