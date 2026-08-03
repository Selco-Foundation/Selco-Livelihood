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
import * as userProfileApi from "@/shared/api/user-profile";
import * as mdmsApi from "@/shared/api/mdms";
import { ProfilePage } from "./ProfilePage";

/**
 * Unit tests for ProfilePage.
 *
 * ProfilePage fetches the current employee's profile on mount (via
 * `searchCurrentUser`), renders a loading state while that request is
 * in flight, and populates a react-hook-form + zod-validated form with
 * the result (name, email, read-only mobile number). Editing the name
 * or email enables the Save button (gated on react-hook-form's
 * `dirtyFields`, not just any re-render), and submitting calls
 * `updateUserProfile` with the trimmed values.
 *
 * Testing approach:
 * - `renderPage()` mounts the real ProfilePage through a minimal
 *   TanStack Router tree (with a stub change-password route) so the
 *   "Change Password" link and route-dependent hooks resolve exactly
 *   as they do in the app, wrapped in a real QueryClientProvider and a
 *   throwaway i18next instance with empty resources (so `translateOr`
 *   falls back to the English default strings asserted against here).
 * - `searchCurrentUser` / `updateUserProfile` are spied on directly via
 *   the `user-profile` API module so each test controls exactly what
 *   the "server" returns, without a real network/auth backend.
 * - `seedAuthenticatedSession` / `resetAuthStore` (shared test helpers)
 *   populate/clear the auth store so the profile-loading effect's
 *   uuid/tenant/token guard is satisfied.
 * - `fetchLanguages` is mocked to resolve empty so the LanguageSwitcher
 *   rendered in the page header doesn't trigger unrelated network calls.
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

const PROFILE_PATH = "/livelihood-ui/employee/profile";

function renderPage() {
  const rootRoute = createRootRoute();
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: PROFILE_PATH,
    component: ProfilePage,
  });
  const changePasswordRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/livelihood-ui/employee/profile/change-password",
    component: () => <div>Change Password Page</div>,
  });
  const routeTree = rootRoute.addChildren([profileRoute, changePasswordRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [PROFILE_PATH] }),
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
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

// ProfilePage: on mount, its effect checks the auth store for a
// user uuid + employeeTenantId + accessToken; if any is missing it bails
// out of loading immediately (nothing to fetch), otherwise it calls
// `searchCurrentUser` and, while that promise is pending, renders a
// centered "Loading..." placeholder instead of the form. Once resolved
// (or rejected), it seeds the react-hook-form defaults from the result
// and flips isLoading off.
describe("ProfilePage", () => {
  it("shows a loading state before the profile loads", async () => {
    // seedAuthenticatedSession() satisfies the uuid/tenant/token guard so
    // the effect actually calls searchCurrentUser instead of short-circuiting;
    // the mock never resolves, keeping the component in isLoading=true so the
    // "Loading..." text is observable.
    seedAuthenticatedSession();
    vi.spyOn(userProfileApi, "searchCurrentUser").mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(await screen.findByText("Loading...")).toBeInTheDocument();
  });

  it("populates the form with the fetched profile", async () => {
    seedAuthenticatedSession();
    vi.spyOn(userProfileApi, "searchCurrentUser").mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
      emailId: "jane@example.com",
      mobileNumber: "9999999999",
    });
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());
    expect(screen.getByDisplayValue("jane@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9999999999")).toBeInTheDocument();
  });

  it("disables Save until a field is actually changed (dirty-fields gating)", async () => {
    // hasProfileChanges reads react-hook-form's dirtyFields.name/email, not
    // the current field values themselves, so merely populating the form
    // via form.reset() after the fetch must not mark it dirty -- Save should
    // stay disabled until the user actually edits a field.
    seedAuthenticatedSession();
    vi.spyOn(userProfileApi, "searchCurrentUser").mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
    });
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save once the name field is edited, and submits the update", async () => {
    // Editing the name dirties the field, which flips hasProfileChanges and
    // enables Save; submitting then drives onSubmit, which strips the
    // `photo` field off the loaded profile and calls updateUserProfile with
    // the trimmed name -- this asserts that full round trip fires.
    const user = userEvent.setup();
    seedAuthenticatedSession();
    vi.spyOn(userProfileApi, "searchCurrentUser").mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
    });
    const updateSpy = vi.spyOn(userProfileApi, "updateUserProfile").mockResolvedValue(null);
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());
    const nameInput = screen.getByDisplayValue("Jane Doe");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");

    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
  });

  it("rejects an invalid email format and does not submit the update", async () => {
    const user = userEvent.setup();
    seedAuthenticatedSession();
    vi.spyOn(userProfileApi, "searchCurrentUser").mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
      emailId: "",
    });
    const updateSpy = vi.spyOn(userProfileApi, "updateUserProfile");
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument());
    const emailInput = document.querySelector('input[type="email"]')!;
    await user.type(emailInput, "not-an-email");
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    // zodResolver's object-level .refine() blocks the RHF submit handler
    // before onSubmit runs, so the update call never fires.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
