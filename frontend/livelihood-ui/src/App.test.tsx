/**
 * Unit tests for src/App.tsx
 *
 * App.tsx is the application's root composition component. It builds a
 * single TanStack Router instance (via createAppRouter()) once, at
 * module-import time, then renders:
 *
 *   TooltipProvider
 *     I18nProvider              (gates children until initI18n() resolves)
 *       QueryProvider            (React Query's QueryClientProvider)
 *         RouterProvider          (renders the matched route)
 *         Toaster                 (sonner toast portal, sibling of the router)
 *
 * I18nProvider (src/shared/i18n/provider.tsx) is the one piece of real,
 * observable branching logic App.tsx pulls in: it shows a "Loading
 * translations..." placeholder while its real, network-backed initI18n()
 * call is in flight, and only mounts <I18nextProvider> (unblocking
 * everything below it, including the router) once that promise resolves.
 * These tests exercise both sides of that gate.
 *
 * Testing approach / mocking strategy:
 *   - initI18n is mocked with vi.spyOn on the real "@/shared/i18n" module
 *     namespace, the same pattern src/shared/i18n/provider.test.tsx uses,
 *     so the suite never makes a real fetchLocalization() network call.
 *   - "./router" (createAppRouter) is mocked to return a small, real
 *     TanStack Router built with createMemoryHistory + createRootRoute,
 *     the same harness shape used by renderWithProviders.tsx and sibling
 *     page tests. This keeps the suite scoped to App.tsx's own provider
 *     wiring rather than re-exercising the real business routes (auth
 *     redirects, LoginPage's own network calls, etc.), which are already
 *     covered by src/modules/core/routes.test.ts and LoginPage.test.tsx.
 *     The mock route's component asserts that content actually rendered
 *     through RouterProvider has access to the QueryProvider above it
 *     (via useQueryClient()) and can dispatch a toast that the sibling
 *     <Toaster/> is mounted to receive.
 *   - No renderWithProviders() wrapper is used: App already supplies every
 *     provider itself, so wrapping it again would just duplicate context
 *     providers around the tree under test.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
// NOTE ON IMPORT ORDER: "./App" is imported before "@/shared/i18n" below.
// src/shared/i18n/locale-persistence.ts and src/shared/stores/locale-store.ts
// import each other (locale-store reads the persisted locale at module-init
// time; locale-persistence writes through the store). Whichever of the two
// modules a test graph reaches *first* determines which finishes initializing
// its top-level bindings before the other's top-level code runs. App.tsx's
// own import chain (via the "@/shared" barrel) reaches locale-store.ts before
// locale-persistence.ts and initializes cleanly; importing "@/shared/i18n"
// directly and first flips that order and trips a TDZ ReferenceError on
// locale-persistence's ACTIVE_LOCALE_KEY. Importing "./App" first here avoids
// that ordering hazard without changing anything being tested.
import { App } from "./App";
import * as i18nIndex from "@/shared/i18n";
import { toast } from "@/ui";

// The mocked router's route component intentionally reaches for
// useQueryClient() and toast.success() so a passing render proves
// QueryProvider and Toaster are really wired into the tree App.tsx
// produces, not just that "something" rendered.
vi.mock("./router", async () => {
  const { createMemoryHistory, createRootRoute, createRouter } =
    await import("@tanstack/react-router");
  const { useQueryClient } = await import("@tanstack/react-query");
  const { useEffect } = await import("react");
  const { toast: routeToast } = await import("@/ui");

  function RouteMarker() {
    const queryClient = useQueryClient();

    useEffect(() => {
      routeToast.success("Route mounted");
    }, []);

    return (
      <div>
        <div>Composed route content</div>
        <div>{queryClient ? "has-query-client" : "no-query-client"}</div>
      </div>
    );
  }

  const router = createRouter({
    routeTree: createRootRoute({ component: RouteMarker }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return { createAppRouter: () => router };
});

afterEach(() => {
  vi.restoreAllMocks();
});

// App() itself has no branches -- it is a fixed provider tree. The only
// runtime behavior worth verifying is how that tree behaves before and
// after I18nProvider's initI18n() call settles, since everything below
// I18nProvider (QueryProvider, RouterProvider, Toaster) is unreachable
// until it resolves.
describe("App", () => {
  // Precondition: initI18n() is stubbed to a promise that never resolves,
  // simulating the real network-backed call still being in flight. Until
  // it settles, I18nProvider must keep rendering its own placeholder and
  // must not mount the router/query/toaster subtree at all.
  it("shows the i18n loading placeholder and withholds the routed tree while initI18n is pending", () => {
    vi.spyOn(i18nIndex, "initI18n").mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByText(/Loading translations/i)).toBeInTheDocument();
    expect(screen.queryByText("Composed route content")).not.toBeInTheDocument();
    expect(document.querySelector("[data-sonner-toaster]")).not.toBeInTheDocument();
  });

  // Precondition: initI18n() resolves (as it would once the real
  // localization fetch completes). This should flip I18nProvider's ready
  // state, mounting QueryProvider + RouterProvider + Toaster underneath it.
  it("renders the routed tree, the query client, and the toaster once initI18n resolves", async () => {
    vi.spyOn(i18nIndex, "initI18n").mockResolvedValue(i18nIndex.i18n);
    const toastSuccessSpy = vi.spyOn(toast, "success");

    render(<App />);

    // The mocked route's own component only renders once RouterProvider
    // has mounted it, which only happens once I18nProvider stops gating.
    expect(await screen.findByText("Composed route content")).toBeInTheDocument();
    // useQueryClient() inside the routed component only returns a client
    // because QueryProvider is composed above RouterProvider in App.tsx.
    expect(screen.getByText("has-query-client")).toBeInTheDocument();
    // <Toaster/> is rendered as a sibling of <RouterProvider/> inside
    // QueryProvider; sonner tags its portal root with this attribute.
    expect(document.querySelector("[data-sonner-toaster]")).toBeInTheDocument();
    // The routed component dispatches a toast on mount -- this only
    // succeeds without throwing because the same "@/ui" toast instance is
    // wired to the mounted <Toaster/>.
    expect(toastSuccessSpy).toHaveBeenCalledWith("Route mounted");
  });
});
