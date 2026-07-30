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

beforeEach(() => {
  vi.spyOn(mdmsApi, "fetchLoginBannerImages").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ForgotPasswordPage", () => {
  it("rejects a mobile number that doesn't match the 10-digit pattern", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByPlaceholderText("Enter your mobile number"), "12345");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(
      await screen.findByText("Enter a valid 10-digit mobile number"),
    ).toBeInTheDocument();
  });

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
