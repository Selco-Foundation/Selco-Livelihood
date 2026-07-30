import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as mdmsApi from "@/shared/api/mdms";
import * as inboxService from "../services/inbox";
import * as facilityApi from "@/shared/api/facility";
import * as assetService from "../services/asset-search";
import { ImOverview } from "./ImOverview";

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

function renderOverview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <ImOverview /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
  vi.spyOn(inboxService, "searchInbox").mockResolvedValue({ items: [], totalCount: 0 });
  vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({ facilities: [], total: 0 });
  vi.spyOn(assetService, "searchAssetsForFacility").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

describe("ImOverview", () => {
  it("renders nothing when the user has no IM access", () => {
    seedAuthenticatedSession({ roles: [{ code: "SOME_OTHER_ROLE" }] });
    const { container } = renderOverview();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the Raise Ticket button for a role that can create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderOverview();
    expect(await screen.findByText("Raise New Ticket")).toBeInTheDocument();
  });

  it("hides the Raise Ticket button for a role that cannot create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderOverview();
    await screen.findByText("Welcome");
    expect(screen.queryByText("Raise New Ticket")).not.toBeInTheDocument();
  });

  it("shows the registered-assets list for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderOverview();
    expect(await screen.findByText("My Registered Assets")).toBeInTheDocument();
  });

  it("does not show the registered-assets list for a non-end-user (staff)", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderOverview();
    await screen.findByText("Welcome");
    expect(screen.queryByText("My Registered Assets")).not.toBeInTheDocument();
  });

  it("shows the user's display name", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }], name: "Jane Doe" });
    renderOverview();
    expect(await screen.findByText(/Jane Doe/)).toBeInTheDocument();
  });
});
