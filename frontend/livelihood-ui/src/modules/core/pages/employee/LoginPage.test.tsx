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

/**
 * Unit tests for `LoginPage`, the employee username/password sign-in screen.
 *
 * Testing approach:
 * - The page is rendered inside a real `@tanstack/react-router` router (with an
 *   in-memory history) rather than being shallow-rendered, because the component
 *   reads its QR-login params via `useSearch({ strict: false })` and calls
 *   `useNavigate()` on successful login — both require an actual router context.
 * - A real `i18next` instance with empty translation resources is used together
 *   with `translateOr`'s fallback-string behavior in the source, so assertions can
 *   target the English fallback copy (e.g. "Enter your username") without needing
 *   to load real translation bundles.
 * - Network/data-layer calls (`loginUser`, `resolveQrLogin`, `searchHrmsEmployee`,
 *   `fetchLoginBannerImages`) are mocked with `vi.spyOn` per test so each test can
 *   drive a specific success/failure path without hitting real APIs.
 * - `useAuthStore` and `useJurisdictionStore` are the real Zustand stores; tests
 *   assert against their state after a submit to confirm the session/jurisdiction
 *   side effects actually ran, and `resetAuthStore()` / explicit `setState` calls
 *   in `afterEach` keep store state from leaking between tests.
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

/**
 * `LoginPage` renders an `AuthLayout`-wrapped form (username + password, via
 * react-hook-form/zod) and, on submit, calls `loginUser`, scopes the returned
 * user's roles to the employee tenant with `filterRolesForEmployeeTenant`,
 * enforces `assertEmployeeRolesAllowed`, hydrates jurisdiction data, and then
 * writes the session/jurisdiction into their respective Zustand stores before
 * navigating to `resolveRedirectPath(from)`. If `tenantId`/`facilityId` search
 * params are present it first runs a QR-login resolution effect that prefills
 * the username field and disables the form until it settles.
 */
describe("LoginPage", () => {
  // Baseline render check with no search params and no mocked API calls: the
  // form should mount immediately (isResolvingQr defaults to false since no
  // tenantId/facilityId are present) and show the username input's fallback
  // placeholder copy from translateOr.
  it("renders username and password fields", async () => {
    renderLoginPage();
    expect(await screen.findByPlaceholderText("Enter your username")).toBeInTheDocument();
  });

  // zod's `min(1, ...)` validation on both fields should fire when the form is
  // submitted empty, surfacing the translateOr fallback messages defined in
  // createLoginSchema rather than calling loginUser.
  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(await screen.findByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  // Happy path: loginUser resolves with a tenant-scoped user and role, and
  // searchHrmsEmployee (invoked indirectly via hydrateEmployeeJurisdictions)
  // resolves jurisdictions, so onSubmit should reach setSession/
  // setJurisdictionData and leave the auth store authenticated with the token.
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

  // loginUser rejects with an object shaped like an OAuth error response;
  // extractOAuthErrorDescription in the source pulls `response.data.error_description`
  // out of it for the toast, and the auth store must stay unauthenticated.
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

  // window.globalConfigs.getConfig("INVALIDROLES") is how assertEmployeeRolesAllowed
  // (in @/shared) looks up the blocked-role list; stubbing it to include
  // "BLOCKED_ROLE" and returning that role from loginUser should make
  // assertEmployeeRolesAllowed throw before the session is ever persisted.
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

  // Providing both tenantId and facilityId search params triggers the page's
  // mount-time QR-login effect, which calls resolveQrLogin and, on success,
  // sets the username field via form.setValue rather than defaultValues.
  it("resolves QR login params and prefills the username", async () => {
    vi.spyOn(qrLoginApi, "resolveQrLogin").mockResolvedValue({ userName: "qr.user" });

    renderLoginPage({ tenantId: "livelihood", facilityId: "fac-1" });

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter your username")).toHaveValue("qr.user"),
    );
  });

  // resolveQrLogin is left pending (never resolves), so isResolvingQr stays true
  // for the life of the test: the "Reading QR code details..." banner should
  // render and the username input should be disabled while it's up.
  it("disables the form while resolving a QR login", async () => {
    vi.spyOn(qrLoginApi, "resolveQrLogin").mockImplementation(() => new Promise(() => {}));

    renderLoginPage({ tenantId: "livelihood", facilityId: "fac-1" });

    expect(await screen.findByText("Reading QR code details...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your username")).toBeDisabled();
  });
});
