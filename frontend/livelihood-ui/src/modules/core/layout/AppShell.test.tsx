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

async function openConfirmDialog(user: ReturnType<typeof userEvent.setup>) {
  const signOutButtons = await screen.findAllByRole("button", { name: "Sign out" });
  await user.click(signOutButtons[0]);
  await screen.findByRole("alertdialog");
}

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

describe("AppShell", () => {
  it("renders the Overview nav link", async () => {
    renderShell();
    expect(await screen.findByRole("link", { name: "Overview" })).toBeInTheDocument();
  });

  it("shows the user's initials derived from their name", async () => {
    seedAuthenticatedSession({ name: "Jane Doe" });
    renderShell();
    expect(await screen.findByText("JA")).toBeInTheDocument();
  });

  it("falls back initials to 'LU' when there's no name or userName", async () => {
    seedAuthenticatedSession({ name: undefined, userName: undefined });
    renderShell();
    expect(await screen.findByText("LU")).toBeInTheDocument();
  });

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

  it("opens the sign-out confirmation dialog when Sign out is clicked", async () => {
    const user = userEvent.setup();
    renderShell();

    await openConfirmDialog(user);

    expect(screen.getByText("Are you sure you want to sign out?")).toBeInTheDocument();
  });

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

  it("clears session even when the logout API call fails (best-effort)", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    vi.spyOn(authApi, "logoutUser").mockRejectedValue(new Error("network down"));
    renderShell();

    await openConfirmDialog(user);
    await user.click(getDialogConfirmButton());

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it("does not clear the session when the sign-out dialog is cancelled", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    renderShell();

    await openConfirmDialog(user);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
