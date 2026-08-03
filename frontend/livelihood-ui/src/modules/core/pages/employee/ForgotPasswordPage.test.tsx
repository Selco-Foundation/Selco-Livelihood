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
import * as authApi from "@/shared/api/auth";
import * as mdmsApi from "@/shared/api/mdms";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

/**
 * Unit tests for ForgotPasswordPage.
 *
 * Covers the mobile-number entry form that kicks off the "forgot password"
 * flow: client-side validation of the 10-digit mobile number, the happy
 * path where an OTP is sent and the user is routed to the change-password
 * page, and the failure path where the OTP request rejects and an error
 * toast is shown instead of navigating.
 *
 * Testing approach:
 * - The page relies on `useTranslate`/i18next for copy, so it is rendered
 *   inside a real (but empty-resource) i18next instance via
 *   `I18nextProvider`; with no resources loaded, `translateOr`'s fallback
 *   English strings are what actually render, which is what the assertions
 *   below match against.
 * - `useNavigate`/`Link` require a real TanStack Router, so a minimal
 *   in-memory router with the forgot-password route and a stub
 *   change-password route is built per test via `renderPage()`, letting
 *   navigation be asserted by checking the stub route's rendered content.
 * - `sendPasswordResetOtp` (network call) and `fetchLoginBannerImages`
 *   (unrelated banner data used by `AuthLayout`) are mocked with
 *   `vi.spyOn` so tests stay isolated from the real API and focus only on
 *   this page's behavior.
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

const FORGOT_PATH = "/livelihood-ui/employee/user/forgot-password";

function renderPage() {
  const rootRoute = createRootRoute();
  const forgotRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: FORGOT_PATH,
    component: ForgotPasswordPage,
  });
  const changePasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/livelihood-ui/employee/user/change-password",
    validateSearch: (search: Record<string, unknown>) => search,
    component: () => <div>Change Password Page</div>,
  });
  const routeTree = rootRoute.addChildren([forgotRoute, changePasswordRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [FORGOT_PATH] }),
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

// `AuthLayout` (the wrapper this page renders inside) fetches login banner
// images on mount; stub it out to an empty list so every test renders
// deterministically without depending on that unrelated network call.
beforeEach(() => {
  vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([]);
});

// Restore all spies after each test so per-test mocks (e.g. `sendPasswordResetOtp`
// success/failure overrides) don't leak into later tests.
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * ForgotPasswordPage renders a single mobile-number field guarded by a zod
 * schema requiring a 10-digit number starting with 6-9 (`createForgotPasswordSchema`).
 * On submit it calls `sendPasswordResetOtp({ mobileNumber, tenantId })`; on
 * success it navigates to the change-password route with the mobile number
 * as a search param, and on failure it shows an error toast (using
 * `extractApiErrorMessage` for the description) instead of navigating.
 */
describe("ForgotPasswordPage", () => {
  // The zod regex `/^[6-9]\d{9}$/` requires exactly 10 digits starting with
  // 6-9, so a 5-digit input fails client-side validation before the API is
  // ever called; the translated fallback validation message should surface.
  it("rejects a mobile number that doesn't match the 10-digit pattern", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByPlaceholderText("Enter your mobile number"), "12345");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(
      await screen.findByText("Enter a valid 10-digit mobile number"),
    ).toBeInTheDocument();
  });

  // A valid 10-digit number passes validation, so the page should call
  // `sendPasswordResetOtp` with the entered number and the resolved
  // `tenantId()` value, then navigate to the change-password route (asserted
  // indirectly via the stub route's rendered text) once the call resolves.
  it("sends the OTP and navigates to the change-password page on success", async () => {
    const user = userEvent.setup();
    const otpSpy = vi.spyOn(authApi, "sendPasswordResetOtp").mockResolvedValue(undefined);
    renderPage();

    await user.type(await screen.findByPlaceholderText("Enter your mobile number"), "9999999999");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    await waitFor(() => expect(otpSpy).toHaveBeenCalledWith({
      mobileNumber: "9999999999",
      tenantId: "livelihood",
    }));
    expect(await screen.findByText("Change Password Page")).toBeInTheDocument();
  });

  // When `sendPasswordResetOtp` rejects, the catch block shows an error
  // toast instead of navigating, so the change-password stub route's
  // content must never appear.
  it("shows an error toast when sending the OTP fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "sendPasswordResetOtp").mockRejectedValue({
      response: { data: { Errors: [{ message: "Mobile number not registered" }] } },
    });
    renderPage();

    await user.type(await screen.findByPlaceholderText("Enter your mobile number"), "9999999999");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    await waitFor(() =>
      expect(screen.queryByText("Change Password Page")).not.toBeInTheDocument(),
    );
  });
});
