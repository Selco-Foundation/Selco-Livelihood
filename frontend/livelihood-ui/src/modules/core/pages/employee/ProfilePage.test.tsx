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

describe("ProfilePage", () => {
  it("shows a loading state before the profile loads", async () => {
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
