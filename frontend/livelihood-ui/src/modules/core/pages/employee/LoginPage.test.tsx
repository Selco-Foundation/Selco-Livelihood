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
import { resetAuthStore } from "@/test/mocks/auth";
import * as authApi from "@/shared/api/auth";
import * as qrLoginApi from "@/shared/api/qr-login";
import * as mdmsApi from "@/shared/api/mdms";
import * as hrmsApi from "@/shared/api/hrms";
import { useAuthStore, useJurisdictionStore } from "@/shared";
import { LoginPage } from "./LoginPage";

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

const LOGIN_PATH = "/livelihood-ui/employee/user/login";

function renderLoginPage(searchParams: Record<string, string> = {}) {
  const rootRoute = createRootRoute();
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: LOGIN_PATH,
    validateSearch: (search: Record<string, unknown>) => search,
    component: LoginPage,
  });
  const routeTree = rootRoute.addChildren([loginRoute]);
  const search = new URLSearchParams(searchParams).toString();
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [search ? `${LOGIN_PATH}?${search}` : LOGIN_PATH] }),
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
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

describe("LoginPage", () => {
  it("renders username and password fields", async () => {
    renderLoginPage();
    expect(await screen.findByPlaceholderText("Enter your username")).toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("logs in successfully and stores the session", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "loginUser").mockResolvedValue({
      access_token: "token-1",
      refresh_token: "refresh-1",
      UserRequest: {
        uuid: "u1",
        userName: "emp1",
        tenantId: "livelihood.sub",
        roles: [{ code: "LIVELIHOOD_POC", tenantId: "livelihood.sub" }],
      },
    });
    vi.spyOn(hrmsApi, "searchHrmsEmployee").mockResolvedValue({
      code: "emp1",
      jurisdictions: [{ boundaryType: "State", boundary: "S1" }],
    });

    renderLoginPage();

    await user.type(await screen.findByPlaceholderText("Enter your username"), "emp1");
    await user.type(document.querySelector('input[name="password"]')!, "secret1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe("token-1");
  });

  it("shows an error toast when login fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(authApi, "loginUser").mockRejectedValue({
      response: { data: { error_description: "Invalid username or password" } },
    });
    renderLoginPage();

    await user.type(await screen.findByPlaceholderText("Enter your username"), "emp1");
    await user.type(document.querySelector('input[name="password"]')!, "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it("shows a permission-denied error when the user's roles are blocked", async () => {
    const user = userEvent.setup();
    window.globalConfigs = { getConfig: (key) => (key === "INVALIDROLES" ? ["BLOCKED_ROLE"] : undefined) };
    vi.spyOn(authApi, "loginUser").mockResolvedValue({
      access_token: "token-1",
      UserRequest: {
        uuid: "u1",
        userName: "emp1",
        tenantId: "livelihood.sub",
        roles: [{ code: "BLOCKED_ROLE", tenantId: "livelihood.sub" }],
      },
    });

    renderLoginPage();

    await user.type(await screen.findByPlaceholderText("Enter your username"), "emp1");
    await user.type(document.querySelector('input[name="password"]')!, "secret1");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("resolves QR login params and prefills the username", async () => {
    vi.spyOn(qrLoginApi, "resolveQrLogin").mockResolvedValue({ userName: "qr.user" });

    renderLoginPage({ tenantId: "livelihood", facilityId: "fac-1" });

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your username")).toHaveValue("qr.user"),
    );
  });

  it("disables the form while resolving a QR login", async () => {
    vi.spyOn(qrLoginApi, "resolveQrLogin").mockImplementation(() => new Promise(() => {}));

    renderLoginPage({ tenantId: "livelihood", facilityId: "fac-1" });

    expect(await screen.findByText("Reading QR code details...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your username")).toBeDisabled();
  });
});
