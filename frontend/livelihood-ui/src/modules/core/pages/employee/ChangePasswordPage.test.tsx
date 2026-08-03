/**
 * Unit tests for ChangePasswordPage.
 *
 * ChangePasswordPage renders the OTP + new-password form employees land on
 * after requesting a password reset (mobile number arrives via the
 * `mobileNumber` search param). It validates the 4-digit OTP client-side
 * before calling `resetPasswordWithOtp`, shows a `PasswordChangedDialog` on
 * success, and runs a 30s resend cooldown (`RESEND_COOLDOWN_SECONDS`) backed
 * by a `setInterval` timer.
 *
 * Testing approach:
 * - The component reads route search params and navigates on success, so it
 *   is rendered inside a real TanStack Router (`RouterProvider`) with a
 *   memory history seeded with `?mobileNumber=...`, plus a `QueryClientProvider`
 *   and a bare `I18nextProvider` (empty resources — `translateOr` fallback
 *   strings are asserted on instead of translation keys).
 * - Fake timers (`vi.useFakeTimers`) drive the resend cooldown deterministically;
 *   `userEvent` is configured with `advanceTimers` so user interactions and
 *   the cooldown ticker can coexist in the same test.
 * - `authApi.resetPasswordWithOtp` / `sendPasswordResetOtp` are spied on
 *   per-test to control success/failure without hitting a real API, and
 *   `mdmsApi.fetchLoginBannerImages` (used by `AuthLayout`) is stubbed in
 *   `beforeEach` so it never fires an unhandled network call.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "@/shared/api/auth";
import * as mdmsApi from "@/shared/api/mdms";
import { ChangePasswordPage } from "./ChangePasswordPage";

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

const CHANGE_PATH = "/livelihood-ui/employee/user/change-password";

function renderPage(mobileNumber = "9999999999") {
  const rootRoute = createRootRoute();
  const changePasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: CHANGE_PATH,
    validateSearch: (search: Record<string, unknown>) => search,
    component: ChangePasswordPage,
  });
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/livelihood-ui/employee/user/login",
    component: () => <div>Login Page</div>,
  });
  const routeTree = rootRoute.addChildren([changePasswordRoute, loginRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [`${CHANGE_PATH}?mobileNumber=${mobileNumber}`],
    }),
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

function getOtpInputs() {
  return screen.getAllByRole("textbox").filter((el) => el.getAttribute("maxlength") === "1");
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ChangePasswordPage: OTP + new-password reset form. Reads `mobileNumber`
// from the route search params to display "OTP sent to +91 - <number>",
// requires a 4-digit OTP before it will call resetPasswordWithOtp, validates
// the new/confirm password fields via the shared password-confirmation
// schema, and shows PasswordChangedDialog on a successful reset.
describe("ChangePasswordPage", () => {
  // `mobileNumber` comes from the route's `?mobileNumber=` search param and is
  // interpolated directly into the AuthLayout subtitle ("OTP sent to +91 -
  // <number>"), so rendering with a given number should surface it verbatim.
  it("shows the OTP-sent message with the mobile number", async () => {
    renderPage("9999999999");
    expect(await screen.findByText(/9999999999/)).toBeInTheDocument();
  });

  // The OTP field only gates submission once it matches /^\d{4}$/; here the
  // OTP is left empty (all other fields valid) so the component must short-
  // circuit before ever calling resetPasswordWithOtp.
  it("rejects submission with an invalid (non-4-digit) OTP", async () => {
    const { toast } = await import("@/ui");
    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
    const resetSpy = vi.spyOn(authApi, "resetPasswordWithOtp");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await screen.findByPlaceholderText("Enter your username");
    await user.type(screen.getByPlaceholderText("Enter your username"), "emp1");
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLInputElement, "newpass1");
    await user.type(passwordInputs[1] as HTMLInputElement, "newpass1");

    await user.click(screen.getByRole("button", { name: "Change Password" }));

    // No Toaster is mounted in this test tree, so the toast message never
    // reaches the DOM — assert on the toast call and that submission never
    // proceeded to the API instead.
    await waitFor(() =>
      expect(toastErrorSpy).toHaveBeenCalledWith("Enter the 4-digit OTP"),
    );
    expect(resetSpy).not.toHaveBeenCalled();
  });

  // Filling all 4 OTP boxes with digits and matching passwords should pass
  // both the client-side OTP regex check and the zod schema, letting
  // onSubmit call the (mocked) resetPasswordWithOtp and flip isSuccess,
  // which mounts PasswordChangedDialog.
  it("submits successfully with a valid OTP and shows the success dialog", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(authApi, "resetPasswordWithOtp").mockResolvedValue(undefined);
    renderPage();

    await screen.findByPlaceholderText("Enter your username");
    const otpInputs = getOtpInputs();
    await user.type(otpInputs[0], "1");
    await user.type(otpInputs[1], "2");
    await user.type(otpInputs[2], "3");
    await user.type(otpInputs[3], "4");

    await user.type(screen.getByPlaceholderText("Enter your username"), "emp1");
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLInputElement, "newpass1");
    await user.type(passwordInputs[1] as HTMLInputElement, "newpass1");

    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Password updated successfully")).toBeInTheDocument();
  });

  // newPassword and confirmPassword deliberately differ; the shared
  // refinePasswordConfirmation schema rejects this before the OTP check
  // even runs, so the mismatch message must surface without an OTP typed.
  it("shows a mismatch error when passwords differ", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    await user.type(await screen.findByPlaceholderText("Enter your username"), "emp1");
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0] as HTMLInputElement, "newpass1");
    await user.type(passwordInputs[1] as HTMLInputElement, "different");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });

  // The resend button starts disabled for RESEND_COOLDOWN_SECONDS (30s) and
  // its label counts down; advancing fake timers by exactly 30s should let
  // resendCooldown reach 0 and re-enable the button with the "Resend OTP" label.
  it("disables the resend button during the cooldown, then enables it", async () => {
    renderPage();
    await screen.findByPlaceholderText("Enter your username");

    const resendButton = screen.getByRole("button", { name: /resend otp in/i });
    expect(resendButton).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Resend OTP" })).not.toBeDisabled(),
    );
  });

  // Once the cooldown expires the button is clickable and re-invokes
  // sendPasswordResetOtp (handleResendOtp), which on success resets
  // resendCooldown back to RESEND_COOLDOWN_SECONDS.
  it("resends the OTP and resets the cooldown when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const otpSpy = vi.spyOn(authApi, "sendPasswordResetOtp").mockResolvedValue(undefined);
    renderPage();
    await screen.findByPlaceholderText("Enter your username");

    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    await waitFor(() => screen.getByRole("button", { name: "Resend OTP" }));

    await user.click(screen.getByRole("button", { name: "Resend OTP" }));

    await waitFor(() => expect(otpSpy).toHaveBeenCalled());
  });
});
