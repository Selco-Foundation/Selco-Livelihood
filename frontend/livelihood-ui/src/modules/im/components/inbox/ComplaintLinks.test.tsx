/**
 * Unit tests for ComplaintLinks (src/modules/im/components/inbox/ComplaintLinks.tsx).
 *
 * Covers:
 *  - Role-gated link visibility: the component reads the current
 *    `useAuthStore` user's roles and calls `canCreateIncident(user?.roles)`
 *    (from ../../utils/access) to decide whether the "New Ticket" link is
 *    included in the `links` array at all. When the user is unauthenticated
 *    (no roles) or has a role that cannot create an incident, `links` is
 *    empty and no <Link> is rendered -- only the static header ("Tickets")
 *    remains.
 *  - Link href construction: when the role check passes, the single link's
 *    `to` is built as `${basePath}/incident/create` where
 *    `basePath = /${contextPath()}/employee/im`. contextPath() reads
 *    window.globalConfigs.getConfig("CONTEXT_PATH") and falls back to
 *    "livelihood-ui" when unset (the default stub installed by
 *    src/test/setup.ts), so the expected href is
 *    "/livelihood-ui/employee/im/incident/create".
 *  - Text content: the link label and header both go through
 *    translateOr(t, KEY, fallback); with no i18n resources registered the
 *    lookup misses and the literal fallback strings ("New Ticket",
 *    "Tickets") are rendered, mirroring the app's real "missing
 *    translation" behavior.
 *
 * Testing approach:
 *  - The component renders a TanStack Router <Link>, so it is mounted
 *    through a real RouterProvider (createRootRoute + createMemoryHistory),
 *    same pattern as other router-dependent components in this module
 *    (see ImOverview.test.tsx). This lets `screen.findByRole("link")`
 *    resolve the rendered href, rather than mocking <Link> away.
 *  - Auth state is real Zustand store state, seeded/reset via
 *    src/test/mocks/auth.ts (seedAuthenticatedSession / resetAuthStore),
 *    not a mocked hook -- consistent with the "mock the API layer, not
 *    React hooks" convention used elsewhere in this suite.
 *  - i18n uses a lightweight test-only i18next instance with no resources
 *    registered, exercising translateOr's fallback path, exactly like the
 *    other inbox component tests (InboxStatus.test.tsx, EndUserAssetsList.test.tsx).
 *  - No network/service mocking is needed; ComplaintLinks makes no API calls.
 */
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
import { afterEach, describe, expect, it } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { ComplaintLinks } from "./ComplaintLinks";

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

function renderComplaintLinks() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <ComplaintLinks /> });
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

afterEach(() => {
  resetAuthStore();
});

describe("ComplaintLinks - header rendering", () => {
  // The "Tickets" header and icon block render unconditionally regardless
  // of role, since they sit outside the `links.map(...)` block.
  it("renders the header label even when there is no authenticated user", async () => {
    renderComplaintLinks();
    expect(await screen.findByText("Tickets")).toBeInTheDocument();
  });
});

describe("ComplaintLinks - role-gated New Ticket link", () => {
  // canCreateIncident returns true only for COMPLAINANT or LIVELIHOOD_POC
  // roles (see ../../utils/access.ts). For any other role -- or no user at
  // all -- `links` is built as [] and no <Link> should be present.
  it("does not render the New Ticket link when there is no authenticated user", async () => {
    renderComplaintLinks();
    await screen.findByText("Tickets");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("does not render the New Ticket link for a role that cannot create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_VENDOR" }] });
    renderComplaintLinks();
    await screen.findByText("Tickets");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // COMPLAINANT is one of the two roles in INCIDENT_CREATE_ROLES, so
  // canCreateIncident(...) is true and the single link entry is rendered.
  it("renders the New Ticket link with the expected href for a COMPLAINANT user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderComplaintLinks();

    const link = await screen.findByRole("link", { name: "New Ticket" });
    expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/incident/create");
  });

  // LIVELIHOOD_POC is the other role in INCIDENT_CREATE_ROLES, exercising
  // the `.some(...)` branch that isn't covered by the COMPLAINANT case above.
  it("renders the New Ticket link for a LIVELIHOOD_POC user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "LIVELIHOOD_POC" }] });
    renderComplaintLinks();

    const link = await screen.findByRole("link", { name: "New Ticket" });
    expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/incident/create");
  });

  it("renders exactly one link for a role that can create incidents", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINANT" }] });
    renderComplaintLinks();

    await screen.findByRole("link");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
