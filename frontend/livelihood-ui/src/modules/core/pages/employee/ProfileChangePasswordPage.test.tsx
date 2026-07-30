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

describe("ProfileChangePasswordPage", () => {
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
