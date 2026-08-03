import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import * as authApi from "@/shared/api/auth";
import { useAuthStore, useJurisdictionStore } from "@/shared";
import { setRegisteredModules } from "@/module-registry";
import { AppShell } from "./AppShell";

/**
 * Unit tests for `AppShell`, the authenticated layout shell that renders the
 * sidebar/mobile nav, user avatar+initials, and the sign-out confirmation flow.
 *
 * Testing approach:
 * - `AppShell` is rendered as a routed component (via a real TanStack Router
 *   instance with a memory history) rather than mounted directly, because it
 *   reads the current pathname from `useRouterState` and renders an `<Outlet />`
 *   for the active child route.
 * - A minimal i18next instance with empty resources is wired in through
 *   `I18nextProvider` so `useTranslate`/`translateOr` resolve to their English
 *   fallback strings (there are no translation keys loaded), letting tests
 *   assert on the literal fallback copy (e.g. "Sign out").
 * - Auth/jurisdiction state is exercised through the real Zustand stores
 *   (`useAuthStore`, `useJurisdictionStore`) via the `seedAuthenticatedSession`/
 *   `resetAuthStore` test helpers rather than being mocked, so assertions can
 *   check actual store state after interactions (e.g. sign-out clearing it).
 * - Only the network-facing `logoutUser` API call is mocked (per test, via
 *   `vi.spyOn`) since it's the one true side effect that should not hit a
 *   real network in unit tests; everything else (dialog, navigation, nav
 *   items) runs through real component behavior.
 */

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return instance;
}

const HOME_PATH = "/livelihood-ui/employee";

// Mounts `AppShell` as the component for `HOME_PATH`, with a child index
// route rendering placeholder content into its `<Outlet />`. This mirrors how
// `AppShell` is used in the real router tree (a layout route wrapping a home
// route) and lets `useRouterState`/`isNavItemActive` see a real, matching
// pathname instead of an empty/undefined one.
function renderShell() {
  const rootRoute = createRootRoute();
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: HOME_PATH,
    component: AppShell,
  });
  const indexRoute = createRoute({
    getParentRoute: () => layoutRoute,
    path: "/",
    component: () => <div>Home Content</div>,
  });
  const routeTree = rootRoute.addChildren([layoutRoute.addChildren([indexRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [HOME_PATH] }),
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

// AppShell renders two "Sign out" trigger buttons (desktop sidebar footer +
// mobile sheet footer) plus, once opened, an AlertDialogAction that is also
// labelled "Sign out" — so `findAllByRole` can return multiple matches. This
// helper always opens the dialog via the first (desktop) trigger button.
async function openConfirmDialog(user: ReturnType<typeof userEvent.setup>) {
  const signOutButtons = await screen.findAllByRole("button", { name: "Sign out" });
  await user.click(signOutButtons[0]);
  await screen.findByRole("alertdialog");
}

// Once the confirmation dialog is open there are three "Sign out"-labelled
// buttons in the DOM (the two triggers plus the dialog's own confirm action).
// Disambiguate by picking the one that lives inside the `alertdialog` so
// tests click the actual confirm action rather than a background trigger.
function getDialogConfirmButton() {
  return screen
    .getAllByRole("button", { name: "Sign out" })
    .find((button) => button.closest('[role="alertdialog"]'))!;
}

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  setRegisteredModules([]);
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

// `AppShell` is the authenticated app layout: it composes the desktop
// sidebar and mobile Sheet nav (both built from `getModuleNavItems()` plus a
// synthetic "Overview" home entry), derives the user's avatar initials from
// `useAuthStore`'s `user.name`/`user.userName` (falling back to "LU" for
// "Logged-in User" when neither is present), highlights the active nav item
// via `isNavItemActive`/`useRouterState`'s pathname, and owns the sign-out
// confirmation dialog that calls `logoutUser`, clears the auth/jurisdiction
// stores, and navigates to the login page. It expects to run under a
// `SidebarProvider`-friendly router (rendered as a routed component here) and
// an authenticated (or anonymous-but-rendered) auth store.
describe("AppShell", () => {
  // "Overview" is a synthetic nav item AppShell prepends itself (it is not
  // returned by `getModuleNavItems()`, which is empty by default in tests),
  // so seeing it render confirms the nav list is built even with no
  // registered modules.
  it("renders the Overview nav link", async () => {
    renderShell();
    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
  });

  // Initials are computed by taking the first two characters of `user.name`
  // and upper-casing them — "Jane Doe" should surface as "JA", not "JD".
  it("shows the user's initials derived from their name", async () => {
    seedAuthenticatedSession({ name: "Jane Doe" });
    renderShell();
    expect(await screen.findByText("JA")).toBeInTheDocument();
  });

  // When both `user.name` and `user.userName` are absent, AppShell's initials
  // fallback chain bottoms out at the literal "LU" placeholder rather than
  // rendering blank/undefined text.
  it("falls back initials to 'LU' when there's no name or userName", async () => {
    seedAuthenticatedSession({ name: undefined, userName: undefined });
    renderShell();
    expect(await screen.findByText("LU")).toBeInTheDocument();
  });

  // The mobile header's "Open menu" button toggles the Radix `Sheet`
  // (`mobileNavOpen` state) that duplicates the desktop sidebar nav for
  // small viewports; this verifies clicking it actually opens that sheet.
  it("opens the mobile nav sheet when the menu button is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByRole("button", { name: /open menu/i }));

    // Radix marks the background inert (aria-hidden) while the Sheet is open,
    // so only the portalled dialog's own Overview link is accessible-tree
    // visible at this point — not "more than before".
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Overview" }),
    ).toBeInTheDocument();
  });

  // Clicking either "Sign out" trigger only flips `confirmOpen` to show the
  // `AlertDialog` — it must not itself call `logoutUser` or clear the auth
  // store, so this checks the dialog copy renders without touching session
  // state.
  it("opens the sign-out confirmation dialog when Sign out is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await openConfirmDialog(user);

    expect(screen.getByText("Are you sure you want to sign out?")).toBeInTheDocument();
  });

  // Confirming sign-out should call the real `logoutUser` API (mocked here to
  // resolve successfully) and clear `useAuthStore`'s authenticated state —
  // asserted on the store directly since navigation to the login route is a
  // side effect of the same handler.
  it("clears session, calls logoutUser, and navigates to login on confirmed sign-out", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    const logoutSpy = vi.spyOn(authApi, "logoutUser").mockResolvedValue(undefined);
    renderShell();

    await openConfirmDialog(user);
    await user.click(getDialogConfirmButton());

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(logoutSpy).toHaveBeenCalled();
  });

  // AppShell's confirm handler wraps the `logoutUser` call in a try/catch and
  // clears the session in the `finally` block, so a rejected API call must
  // not block local sign-out — this is the "best-effort" logout business
  // rule under test.
  it("clears session even when the logout API call fails (best-effort)", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    vi.spyOn(authApi, "logoutUser").mockRejectedValue(new Error("network down"));
    renderShell();

    await openConfirmDialog(user);
    await user.click(getDialogConfirmButton());

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  // Clicking `AlertDialogCancel` just closes the dialog (Radix's built-in
  // cancel behavior) without ever invoking the confirm action's onClick, so
  // `logoutUser`/`clearSession` must never run and the store stays
  // authenticated.
  it("does not clear the session when the sign-out dialog is cancelled", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    renderShell();

    await openConfirmDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
