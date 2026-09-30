import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleDefinition, NavItem } from "@/shared";
import {
  getModuleNavItems,
  getModuleOverviews,
  getRegisteredModules,
  setRegisteredModules,
} from "./module-registry";

function makeModule(overrides: Partial<ModuleDefinition> = {}): ModuleDefinition {
  return {
    id: "test-module",
    order: 1,
    routes: [],
    navItems: [],
    ...overrides,
  };
}

function makeNavItem(overrides: Partial<NavItem> = {}): NavItem {
  return { id: "nav-1", label: "Nav 1", to: "/nav-1", ...overrides };
}

beforeEach(() => {
  setRegisteredModules([]);
});

describe("setRegisteredModules / getRegisteredModules", () => {
  it("stores and returns exactly the modules passed in", () => {
    const modules = [makeModule({ id: "a" }), makeModule({ id: "b" })];

    setRegisteredModules(modules);

    expect(getRegisteredModules()).toBe(modules);
  });

  it("overwrites any previously registered modules", () => {
    setRegisteredModules([makeModule({ id: "first" })]);
    setRegisteredModules([makeModule({ id: "second" })]);

    expect(getRegisteredModules().map((module) => module.id)).toEqual(["second"]);
  });

  describe("dev-mode visibility warning", () => {
    it("warns when a non-shell module has no kpis, details, actions, or navItems", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      setRegisteredModules([makeModule({ id: "invisible", order: 3 })]);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"invisible"'));
    });

    it("does not warn when the module has navItems", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      setRegisteredModules([makeModule({ id: "has-nav", navItems: [makeNavItem()] })]);

      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn when the module has an overview.kpis slot", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const Kpis = () => null;

      setRegisteredModules([makeModule({ id: "has-kpis", overview: { kpis: Kpis } })]);

      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn when the module has an overview.details slot", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const Details = () => null;

      setRegisteredModules([makeModule({ id: "has-details", overview: { details: Details } })]);

      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn when the module has an overview.actions slot", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const Actions = () => null;

      setRegisteredModules([makeModule({ id: "has-actions", overview: { actions: Actions } })]);

      expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn for the shell module (order 0) even with no surface at all", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      setRegisteredModules([makeModule({ id: "core", order: 0 })]);

      expect(warn).not.toHaveBeenCalled();
    });

    it("warns once per module that lacks a visible surface, across several modules", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      setRegisteredModules([
        makeModule({ id: "invisible-a", order: 1 }),
        makeModule({ id: "has-nav", order: 2, navItems: [makeNavItem()] }),
        makeModule({ id: "invisible-b", order: 3 }),
      ]);

      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"invisible-a"'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('"invisible-b"'));
    });
  });
});

describe("getModuleNavItems", () => {
  it("returns an empty array when no modules are registered", () => {
    expect(getModuleNavItems()).toEqual([]);
  });

  it("includes an item with no roles regardless of the signed-in user's roles", () => {
    setRegisteredModules([makeModule({ navItems: [makeNavItem({ id: "public" })] })]);

    expect(getModuleNavItems()).toEqual([expect.objectContaining({ id: "public" })]);
    expect(getModuleNavItems([{ code: "ANY_ROLE" }])).toEqual([expect.objectContaining({ id: "public" })]);
  });

  it("hides an item with roles when userRoles is omitted (no signed-in user)", () => {
    setRegisteredModules([
      makeModule({ navItems: [makeNavItem({ id: "gated", roles: ["ADMIN"] })] }),
    ]);

    expect(getModuleNavItems()).toEqual([]);
  });

  it("hides an item with roles when the user holds none of them", () => {
    setRegisteredModules([
      makeModule({ navItems: [makeNavItem({ id: "gated", roles: ["ADMIN"] })] }),
    ]);

    expect(getModuleNavItems([{ code: "OTHER_ROLE" }])).toEqual([]);
  });

  it("shows an item with roles when the user holds at least one of them", () => {
    setRegisteredModules([
      makeModule({ navItems: [makeNavItem({ id: "gated", roles: ["ADMIN", "MANAGER"] })] }),
    ]);

    expect(getModuleNavItems([{ code: "MANAGER" }])).toEqual([expect.objectContaining({ id: "gated" })]);
  });

  it("ignores roles whose code is undefined when building the user's role set", () => {
    setRegisteredModules([
      makeModule({ navItems: [makeNavItem({ id: "gated", roles: ["ADMIN"] })] }),
    ]);

    expect(getModuleNavItems([{ code: undefined }])).toEqual([]);
  });

  it("orders nav items by ascending module order across modules", () => {
    setRegisteredModules([
      makeModule({ id: "b", order: 2, navItems: [makeNavItem({ id: "b1" })] }),
      makeModule({ id: "a", order: 1, navItems: [makeNavItem({ id: "a1" })] }),
    ]);

    expect(getModuleNavItems().map((item) => item.id)).toEqual(["a1", "b1"]);
  });

  it("treats a missing order as 99, sorting it after modules with an explicit order", () => {
    setRegisteredModules([
      makeModule({ id: "no-order", order: undefined, navItems: [makeNavItem({ id: "n1" })] }),
      makeModule({ id: "ordered", order: 1, navItems: [makeNavItem({ id: "o1" })] }),
    ]);

    expect(getModuleNavItems().map((item) => item.id)).toEqual(["o1", "n1"]);
  });

  it("preserves each module's own navItems order within the flattened list", () => {
    setRegisteredModules([
      makeModule({
        id: "multi",
        order: 1,
        navItems: [makeNavItem({ id: "first" }), makeNavItem({ id: "second" })],
      }),
    ]);

    expect(getModuleNavItems().map((item) => item.id)).toEqual(["first", "second"]);
  });
});

describe("getModuleOverviews", () => {
  it("returns empty sections when no modules are registered", () => {
    expect(getModuleOverviews()).toEqual({ kpis: [], details: [], actions: [] });
  });

  it("splits modules into kpis/details/actions sections by their overview slots", () => {
    const Kpis = () => null;
    const Details = () => null;
    const Actions = () => null;

    setRegisteredModules([
      makeModule({ id: "full", order: 1, overview: { kpis: Kpis, details: Details, actions: Actions } }),
    ]);

    const result = getModuleOverviews();

    expect(result.kpis).toEqual([{ Component: Kpis, moduleId: "full" }]);
    expect(result.details).toEqual([{ Component: Details, moduleId: "full" }]);
    expect(result.actions).toEqual([{ Component: Actions, moduleId: "full" }]);
  });

  it("excludes a module from a section whose slot it doesn't define", () => {
    const Kpis = () => null;

    setRegisteredModules([makeModule({ id: "kpis-only", overview: { kpis: Kpis } })]);

    const result = getModuleOverviews();

    expect(result.kpis).toEqual([{ Component: Kpis, moduleId: "kpis-only" }]);
    expect(result.details).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it("excludes a module with no overview at all from every section", () => {
    setRegisteredModules([makeModule({ id: "no-overview" })]);

    expect(getModuleOverviews()).toEqual({ kpis: [], details: [], actions: [] });
  });

  it("orders each section by ascending module order, independent of registration order", () => {
    const KpisB = () => null;
    const KpisA = () => null;

    setRegisteredModules([
      makeModule({ id: "b", order: 2, overview: { kpis: KpisB } }),
      makeModule({ id: "a", order: 1, overview: { kpis: KpisA } }),
    ]);

    expect(getModuleOverviews().kpis.map((entry) => entry.moduleId)).toEqual(["a", "b"]);
  });
});
