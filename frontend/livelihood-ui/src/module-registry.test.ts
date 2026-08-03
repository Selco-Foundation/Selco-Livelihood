/**
 * Unit tests for module-registry.ts.
 *
 * The module registry is a plain in-memory store (a module-level array plus
 * getter/setter functions) that feature modules use to publish their nav
 * items and overview components to the shell app. There is no external
 * dependency to mock here (no network, no context, no rendering) — the
 * functions under test are pure derivations over whatever was last passed to
 * `setRegisteredModules`, so these tests simply seed that state directly via
 * `setRegisteredModules` and assert on the derived output of
 * `getModuleNavItems` / `getModuleOverviews`.
 *
 * Because the registry is shared module-level state (not reset per call),
 * every test resets it in `afterEach` so modules registered by one test
 * never leak into the next.
 */
import { afterEach, describe, expect, it } from "vitest";
import type { ModuleDefinition, NavItem } from "@/shared";
import { getModuleNavItems, getModuleOverviews, setRegisteredModules } from "./module-registry";

// Reset the shared module registry after every test so state doesn't leak
// between test cases (the registry lives in a module-level variable, not
// something React/test-lifecycle managed).
afterEach(() => {
  setRegisteredModules([]);
});

function buildNavItem(overrides: Partial<NavItem> = {}): NavItem {
  return { id: "nav-1", label: "Nav Item", to: "/nav", ...overrides };
}

function buildModule(overrides: Partial<ModuleDefinition> = {}): ModuleDefinition {
  return { id: "test-module", routes: [], navItems: [], ...overrides };
}

// getModuleNavItems() builds the shell app's combined navigation list from
// whatever modules are currently registered. It shallow-copies the registry
// array (so the sort below never mutates the shared state), sorts modules by
// their `order` field (modules with no `order` are treated as 99, i.e. sorted
// last), then flat-maps each module's `navItems` (defaulting to `[]` when a
// module declares none) into a single flat array of nav items.
describe("getModuleNavItems", () => {
  // Baseline case: the module-level registry starts empty (and is reset to
  // empty by the afterEach above), so with nothing ever registered the
  // derivation should short-circuit to an empty array rather than throw.
  it("returns an empty array when no modules are registered", () => {
    expect(getModuleNavItems()).toEqual([]);
  });

  // Confirms the flatMap actually merges navItems from multiple modules into
  // one list (not just returning the first/last module's items).
  it("flattens navItems across all registered modules", () => {
    setRegisteredModules([
      buildModule({ id: "a", navItems: [buildNavItem({ id: "a1", label: "A1", to: "/a1" })] }),
      buildModule({ id: "b", navItems: [buildNavItem({ id: "b1", label: "B1", to: "/b1" })] }),
    ]);
    expect(getModuleNavItems().map((item) => item.label)).toEqual(["A1", "B1"]);
  });

  // Business rule: modules without an explicit `order` default to 99, so an
  // unordered module always sorts after one with an explicit lower order.
  // Registering the unordered module first (and the ordered one second)
  // verifies the sort — not just registration order — determines the result.
  it("sorts modules by order, defaulting missing order to 99", () => {
    setRegisteredModules([
      buildModule({ id: "no-order", navItems: [buildNavItem({ label: "Last" })] }),
      buildModule({ id: "ordered", order: 1, navItems: [buildNavItem({ label: "First" })] }),
    ]);
    expect(getModuleNavItems().map((item) => item.label)).toEqual(["First", "Last"]);
  });

  // A module is allowed to register with `navItems: []` (or omit it, since
  // the source defaults to `[]`); flatMap-ing an empty array contributes
  // nothing to the combined list instead of erroring or inserting undefined.
  it("treats a module with no navItems as contributing nothing", () => {
    setRegisteredModules([buildModule({ id: "empty", navItems: [] })]);
    expect(getModuleNavItems()).toEqual([]);
  });
});

// getModuleOverviews() derives the list of module "overview" screens (used
// e.g. for a dashboard/landing view per module) from the registry. Like
// getModuleNavItems, it shallow-copies and sorts by `order` (missing order
// defaults to 99), but then *filters out* any module that didn't register an
// `overview` component before mapping the survivors to
// `{ Overview, moduleId }` entries. So a module only shows up here if it
// explicitly opted in by providing `overview`.
describe("getModuleOverviews", () => {
  // A registered module is not required to provide an `overview` component;
  // the `.filter((module) => module.overview)` step drops any module without
  // one, so a registry of overview-less modules yields an empty result.
  it("returns an empty array when no module defines an overview", () => {
    setRegisteredModules([buildModule({ id: "a" })]);
    expect(getModuleOverviews()).toEqual([]);
  });

  // Mixes an unordered module, an ordered module without an overview, and two
  // ordered modules with overviews (registered out of order) to confirm both
  // rules at once: modules lacking `overview` are dropped, and the survivors
  // are still emitted in `order` order rather than registration order.
  it("includes only modules with an overview, sorted by order", () => {
    const OverviewA = () => null;
    const OverviewB = () => null;
    setRegisteredModules([
      buildModule({ id: "b", order: 2, overview: OverviewB }),
      buildModule({ id: "no-overview", order: 1 }),
      buildModule({ id: "a", order: 0, overview: OverviewA }),
    ]);
    expect(getModuleOverviews()).toEqual([
      { Overview: OverviewA, moduleId: "a" },
      { Overview: OverviewB, moduleId: "b" },
    ]);
  });
});
