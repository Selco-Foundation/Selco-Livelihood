import { afterEach, describe, expect, it } from "vitest";
import type { ModuleDefinition, NavItem } from "@/shared";
import { getModuleNavItems, getModuleOverviews, setRegisteredModules } from "./module-registry";

afterEach(() => {
  setRegisteredModules([]);
});

function buildNavItem(overrides: Partial<NavItem> = {}): NavItem {
  return { id: "nav-1", label: "Nav Item", to: "/nav", ...overrides };
}

function buildModule(overrides: Partial<ModuleDefinition> = {}): ModuleDefinition {
  return { id: "test-module", routes: [], navItems: [], ...overrides };
}

describe("getModuleNavItems", () => {
  it("returns an empty array when no modules are registered", () => {
    expect(getModuleNavItems()).toEqual([]);
  });

  it("flattens navItems across all registered modules", () => {
    setRegisteredModules([
      buildModule({ id: "a", navItems: [buildNavItem({ id: "a1", label: "A1", to: "/a1" })] }),
      buildModule({ id: "b", navItems: [buildNavItem({ id: "b1", label: "B1", to: "/b1" })] }),
    ]);
    expect(getModuleNavItems().map((item) => item.label)).toEqual(["A1", "B1"]);
  });

  it("sorts modules by order, defaulting missing order to 99", () => {
    setRegisteredModules([
      buildModule({ id: "no-order", navItems: [buildNavItem({ label: "Last" })] }),
      buildModule({ id: "ordered", order: 1, navItems: [buildNavItem({ label: "First" })] }),
    ]);
    expect(getModuleNavItems().map((item) => item.label)).toEqual(["First", "Last"]);
  });

  it("treats a module with no navItems as contributing nothing", () => {
    setRegisteredModules([buildModule({ id: "empty", navItems: [] })]);
    expect(getModuleNavItems()).toEqual([]);
  });
});

describe("getModuleOverviews", () => {
  it("returns an empty array when no module defines an overview", () => {
    setRegisteredModules([buildModule({ id: "a" })]);
    expect(getModuleOverviews()).toEqual([]);
  });

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
