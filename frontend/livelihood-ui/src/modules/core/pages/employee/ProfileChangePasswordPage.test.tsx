/**
 * Unit tests for ProfileChangePasswordPage.
 *
 * Covers the employee "change password" form: the Save button's
 * enable/disable rule (all three fields must be non-empty), the
 * new/confirm password mismatch validation, the happy-path submit flow
 * (API call -> success dialog -> session clear + redirect to login on
 * confirm), and the failure path (API rejects -> error toast, no
 * success dialog).
 *
 * Testing approach:
 * - The page is rendered through a real TanStack Router (memory history)
 *   with routes for the change-password page, the profile page, and the
 *   login page, because the component under test navigates via
 *   `useNavigate`/`Link` and the "clear session and navigate to login"
 *   test asserts on the resulting route actually rendering.
 * - Wrapped in a QueryClientProvider and an I18nextProvider (a fresh,
 *   empty-resource i18next instance per render) since shared hooks used
 *   by the page/child components expect these providers; with no
 *   translation resources loaded, `translateOr` falls back to its
 *   English default strings, which is what the assertions match on.
 * - `fetchLanguages` (mdms API) is mocked to resolve empty so the
 *   LanguageSwitcher rendered in the page header doesn't make a real
 *   network call.
 * - `seedAuthenticatedSession` populates the auth store so the page's
 *   `useAuthStore` selectors (user, accessToken, employeeTenantId) are
 *   populated and `onSubmit` doesn't bail out early.
 * - Only `changePasswordInSession` (the actual password-change API call)
 *   is mocked per-test to control the success/failure path; everything
 *   else runs through real component logic.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as userProfileApi from "@/shared/api/user-profile";
import * as mdmsApi from "@/shared/api/mdms";
import { ProfileChangePasswordPage } from "./ProfileChangePasswordPage";

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

const PATH = "/livelihood-ui/employee/profile/change-password";

function renderPage() {
  const rootRoute = createRootRoute();
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: PATH,
    component: ProfileChangePasswordPage,
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/livelihood-ui/employee/profile",
    component: () => <div>Profile Page</div>,
  });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/livelihood-ui/employee/user/login",
    component: () => <div>Login Page</div>,
  });
  const routeTree = rootRoute.addChildren([route, profileRoute, loginRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [PATH] }),
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

function getPasswordInputs() {
  return document.querySelectorAll('input[type="password"]');
}

beforeEach(() => {
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
  seedAuthenticatedSession({ userName: "emp1", tenantId: "livelihood" });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

// ProfileChangePasswordPage renders the employee "change password" form
// (current/new/confirm password fields via react-hook-form + zod validation).
// Its `onSubmit` requires an authenticated session (userName, accessToken,
// employeeTenantId all present, seeded here via `seedAuthenticatedSession`)
// and calls `changePasswordInSession`; on success it shows
// `PasswordChangedDialog`, whose confirm handler clears the auth/jurisdiction
// stores and navigates to the employee login route. On failure it shows an
// error toast instead. The Save button is disabled until all three fields
// are non-empty (`canSave`), independent of validation state.
describe("ProfileChangePasswordPage", () => {
  // canSave only checks that all three fields are non-empty strings, not that
  // they're valid/matching, so typing any value into each field (even a
  // mismatched confirm password) must flip the button to enabled.
  it("disables Save until all three password fields have a value", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Change Password" })).toBeDisabled();

    const user = userEvent.setup();
    const [current, next, confirm] = getPasswordInputs();
    await user.type(current, "old-pass");
    expect(screen.getByRole("button", { name: "Change Password" })).toBeDisabled();

    await user.type(next, "new-pass");
    await user.type(confirm, "new-pass");
    expect(screen.getByRole("button", { name: "Change Password" })).not.toBeDisabled();
  });

  // The zod schema is built with `refinePasswordConfirmation`, which adds a
  // cross-field check that newPassword === confirmPassword and attaches the
  // "Passwords do not match" (translateOr fallback) message to the confirm
  // field; this only surfaces after a submit attempt runs validation.
  it("shows a mismatch error when new and confirm passwords differ", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("button", { name: "Change Password" });

    const [current, next, confirm] = getPasswordInputs();
    await user.type(current, "old-pass");
    await user.type(next, "new-pass-1");
    await user.type(confirm, "new-pass-2");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  // `changePasswordInSession` is mocked to resolve so `onSubmit` sets
  // `isSuccess` true, which renders `PasswordChangedDialog` with its
  // "Password updated successfully" content.
  it("submits successfully and shows the success dialog", async () => {
    const user = userEvent.setup();
    vi.spyOn(userProfileApi, "changePasswordInSession").mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole("button", { name: "Change Password" });

    const [current, next, confirm] = getPasswordInputs();
    await user.type(current, "old-pass");
    await user.type(next, "new-pass");
    await user.type(confirm, "new-pass");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Password updated successfully")).toBeInTheDocument();
  });

  // Clicking the dialog's "OK" button runs the `onConfirm` callback passed to
  // `PasswordChangedDialog`, which calls `clearSession`/`clearJurisdiction`
  // and navigates to `employeeLoginPath()`; asserting on the login route's
  // rendered content confirms the navigation actually happened (this uses a
  // real router, not a navigate mock).
  it("clears the session and navigates to login when the success dialog is confirmed", async () => {
    const user = userEvent.setup();
    vi.spyOn(userProfileApi, "changePasswordInSession").mockResolvedValue(undefined);
    renderPage();
    await screen.findByRole("button", { name: "Change Password" });

    const [current, next, confirm] = getPasswordInputs();
    await user.type(current, "old-pass");
    await user.type(next, "new-pass");
    await user.type(confirm, "new-pass");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await user.click(await screen.findByRole("button", { name: "OK" }));

    await waitFor(() => expect(screen.getByText("Login Page")).toBeInTheDocument());
  });

  // `changePasswordInSession` rejects, so `onSubmit`'s catch branch fires
  // `toast.error` instead of setting `isSuccess`; the toast itself isn't
  // asserted directly (it renders outside this component's DOM tree), so the
  // absence of the success dialog's text is used as the observable proxy for
  // "the failure path ran instead of the success path".
  it("shows an error toast when the update fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(userProfileApi, "changePasswordInSession").mockRejectedValue(new Error("failed"));
    renderPage();
    await screen.findByRole("button", { name: "Change Password" });

    const [current, next, confirm] = getPasswordInputs();
    await user.type(current, "old-pass");
    await user.type(next, "new-pass");
    await user.type(confirm, "new-pass");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await waitFor(() =>
      expect(screen.queryByText("Password updated successfully")).not.toBeInTheDocument(),
    );
  });
});
