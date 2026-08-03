/**
 * Unit tests for HomePage (src/modules/core/pages/employee/HomePage.tsx).
 *
 * HomePage itself has no logic beyond a single call: it reads
 * `getModuleOverviews()` from the module registry and maps the returned
 * entries to their `Overview` components, rendering one per module inside a
 * `<div className="space-y-6">` wrapper, keyed by `moduleId`.
 *
 * All of the actual "what shows up on the page" behavior therefore lives in
 * `getModuleOverviews()` (registry ordering/filtering, already covered by
 * src/module-registry.test.ts) and in whatever `Overview` component each
 * module supplies. These tests treat HomePage as the thing under test and
 * the registry as real, undisturbed collaborator code: rather than mocking
 * `@/module-registry`, we use its exported `setRegisteredModules` (the same
 * seam AppShell.test.tsx and module-registry.test.ts use) to register small
 * fake modules with throwaway Overview components, then assert HomePage
 * renders exactly those components, in the order the registry produces them.
 *
 * HomePage performs no data fetching, routing, or translation lookups, so
 * no QueryClient/Router/i18n provider wrapper is needed -- a plain
 * `render()` from Testing Library is sufficient. The registry is reset to
 * empty after every test so state doesn't leak between cases.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ModuleDefinition } from "@/shared";
import { setRegisteredModules } from "@/module-registry";
import { HomePage } from "./HomePage";

function buildModule(overrides: Partial<ModuleDefinition> = {}): ModuleDefinition {
  return { id: "test-module", routes: [], navItems: [], ...overrides };
}

afterEach(() => {
  setRegisteredModules([]);
});

// HomePage: renders `getModuleOverviews().map(...)` -- one <Overview /> per
// registered module that defines an `overview` component, in the order the
// registry hands back (sorted by `order`, modules without an overview
// filtered out entirely).
describe("HomePage", () => {
  it("renders nothing but the wrapper div when no modules are registered", () => {
    setRegisteredModules([]);

    const { container } = render(<HomePage />);

    const wrapper = container.querySelector("div.space-y-6");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toBeEmptyDOMElement();
  });

  it("renders the Overview component for a single registered module", () => {
    setRegisteredModules([
      buildModule({ id: "reports", overview: () => <div>Reports Overview</div> }),
    ]);

    render(<HomePage />);

    expect(screen.getByText("Reports Overview")).toBeInTheDocument();
  });

  // Modules without an `overview` are filtered out by getModuleOverviews;
  // HomePage should simply skip them rather than erroring on a missing
  // component.
  it("skips modules that don't define an overview", () => {
    setRegisteredModules([
      buildModule({ id: "no-overview" }),
      buildModule({ id: "has-overview", overview: () => <div>Has Overview</div> }),
    ]);

    render(<HomePage />);

    expect(screen.getByText("Has Overview")).toBeInTheDocument();
    expect(screen.queryByText(/no-overview/i)).not.toBeInTheDocument();
  });

  // getModuleOverviews sorts by `order` (missing order defaults to 99), so
  // HomePage's render order should follow suit even when modules are
  // registered out of order -- this is the one non-obvious behavior worth
  // pinning down at the HomePage level, since it's what a user actually sees
  // stacked on the page.
  it("renders overviews in ascending `order`, not registration order", () => {
    setRegisteredModules([
      buildModule({ id: "second", order: 2, overview: () => <div>Second Overview</div> }),
      buildModule({ id: "first", order: 1, overview: () => <div>First Overview</div> }),
    ]);

    render(<HomePage />);

    const headings = screen.getAllByText(/Overview$/).map((el) => el.textContent);
    expect(headings).toEqual(["First Overview", "Second Overview"]);
  });

  it("renders one Overview per module when multiple modules are registered", () => {
    setRegisteredModules([
      buildModule({ id: "a", order: 1, overview: () => <div>Overview A</div> }),
      buildModule({ id: "b", order: 2, overview: () => <div>Overview B</div> }),
      buildModule({ id: "c", order: 3, overview: () => <div>Overview C</div> }),
    ]);

    render(<HomePage />);

    expect(screen.getByText("Overview A")).toBeInTheDocument();
    expect(screen.getByText("Overview B")).toBeInTheDocument();
    expect(screen.getByText("Overview C")).toBeInTheDocument();
  });
});
