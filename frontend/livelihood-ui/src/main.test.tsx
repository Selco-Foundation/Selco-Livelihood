/**
 * Unit tests for src/main.tsx
 *
 * main.tsx is the application's client entry point. It has no exported
 * functions/components — its behavior is a sequence of top-level side
 * effects that run once, at module-evaluation time:
 *   1. Look up the #root DOM node via document.getElementById("root").
 *   2. If that node is missing, throw a real `Error("Root element not
 *      found")` — this is the file's only branch.
 *   3. Otherwise call react-dom/client's createRoot(rootElement) and
 *      render <StrictMode><App /></StrictMode> into it.
 *
 * Testing approach:
 *   - "react-dom/client" is mocked with vi.mock so createRoot/.render are
 *     spies rather than a real reconciler. This lets us assert *how*
 *     main.tsx drives the DOM-mounting API without paying the cost (or
 *     risk) of actually mounting the full app tree.
 *   - "./App" is mocked with a trivial stand-in component so the render
 *     call's argument can be inspected precisely (element type identity)
 *     without needing App's own providers (router/query/i18n) to be
 *     wired up. No RouterProvider/I18nextProvider test wrapper is used
 *     here — this file is only about root-mounting wiring, not routing
 *     or translations, and renderWithProviders is for mounting components
 *     into a live DOM via @testing-library/react, which is not how
 *     main.tsx's own side effects are exercised.
 *   - Because the side effects fire once per module evaluation, each test
 *     calls vi.resetModules() and re-imports "./main" fresh after setting
 *     up its own DOM/mock state, so the two branches (root present vs.
 *     absent) don't leak into each other.
 */
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock, unmount: vi.fn() }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

// Stand-in for the real App component (which itself builds a router at
// module-import time). Mocking it keeps this suite scoped to main.tsx's
// own mounting logic.
function MockApp() {
  return null;
}
vi.mock("./App", () => ({ App: MockApp }));

beforeEach(() => {
  document.body.innerHTML = "";
});

afterEach(() => {
  renderMock.mockClear();
  createRootMock.mockClear();
});

// main.tsx's only two behaviors: mounting into a real #root node, and
// throwing when #root is absent.
describe("main.tsx entry point", () => {
  it("creates a root on the #root element and renders <StrictMode><App /></StrictMode> into it", async () => {
    // Precondition for the happy path: document.getElementById("root")
    // must resolve to a real element before main.tsx runs.
    const rootElement = document.createElement("div");
    rootElement.id = "root";
    document.body.appendChild(rootElement);

    vi.resetModules();
    await import("./main");

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledWith(rootElement);

    expect(renderMock).toHaveBeenCalledTimes(1);
    const renderedTree = renderMock.mock.calls[0][0];
    // Assert the exact shape of the rendered element tree: StrictMode
    // wrapping the (mocked) App component.
    expect(renderedTree.type).toBe(StrictMode);
    expect(renderedTree.props.children.type).toBe(MockApp);
  });

  it("throws when #root is missing from the document", async () => {
    // Precondition for the failure branch: no element with id="root"
    // exists anywhere in the document.
    expect(document.getElementById("root")).toBeNull();

    vi.resetModules();
    await expect(import("./main")).rejects.toThrow("Root element not found");

    expect(createRootMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });
});
