/**
 * Unit tests for CreateIncidentPage (src/modules/im/pages/employee/CreateIncidentPage.tsx).
 *
 * CreateIncidentPage is a thin layout/composition wrapper: it computes a few
 * path strings (`basePath = /${contextPath()}`, `homePath = employeeHomePath()`,
 * `inboxPath = ${basePath}${IM_ROUTES.inbox}`) and renders two structurally
 * identical header blocks -- a desktop one (`hidden lg:block`, with a
 * `LanguageSwitcher` action) and a mobile one (`lg:hidden`, no action) -- each
 * with its own `PageHeader` + `ImBreadcrumbs`, followed by a single
 * `CreateTicketForm` fed the computed `inboxPath`. Since jsdom does not apply
 * any real responsive layout, both the desktop and mobile header blocks are
 * simultaneously present in the DOM, so tests that assert on header/breadcrumb
 * text expect two matches (mirroring the sibling InboxPage/ComplaintDetailsPage
 * tests' documented convention for this same pattern).
 *
 * This file covers:
 *   - both header instances render the "Raise New Ticket" title and the
 *     Overview / Inbox / Raise ticket breadcrumb trail, with the expected
 *     breadcrumb link hrefs (Overview -> employeeHomePath(), Inbox -> inboxPath)
 *   - the desktop-only LanguageSwitcher action renders exactly once (not
 *     duplicated into the mobile header)
 *   - CreateTicketForm is rendered exactly once and receives the page's
 *     computed `inboxPath` as a prop
 *
 * Testing approach: CreateTicketForm already has its own dedicated,
 * comprehensive test suite (CreateTicketForm.test.tsx) that exercises its real
 * `useCreateIncidentForm` hook end-to-end against mocked services. Re-running
 * all of that machinery here would duplicate that coverage and couple this
 * page-level test to the form's internal query/upload/validation behavior, so
 * CreateTicketForm is replaced with a tiny stub (via `vi.mock`, the same
 * pattern InboxPage.test.tsx uses for DesktopInbox) that records the props it
 * receives and renders a recognizable placeholder. `fetchLanguages` (used
 * transitively by the real `LanguageSwitcher` rendered in the desktop header)
 * is mocked to resolve `[]` purely to avoid an unmocked network call; the
 * switcher's own behavior is covered by LanguageSwitcher.test.tsx. A real
 * TanStack Router (createMemoryHistory + createRootRoute + createRoute) wraps
 * the render because ImBreadcrumbs renders `<Link>` elements, and a
 * lightweight test-only i18next instance (no resources loaded) stands in for
 * the app's real network-backed i18n provider, so `translateOr` falls back to
 * the English default strings baked into the source -- which is what these
 * assertions check against.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as mdmsApi from "@/shared/api/mdms";
import { CreateIncidentPage } from "./CreateIncidentPage";

// Captured by the CreateTicketForm stub below on every render so tests can
// assert on the exact props CreateIncidentPage passed down.
const createTicketFormSpy = vi.hoisted(() => ({
  latestProps: undefined as { inboxPath: string } | undefined,
  renderCount: 0,
}));

// Stubbed in place of the real CreateTicketForm (see top-of-file comment for
// why): renders a placeholder marker plus the received inboxPath as text, so
// tests can verify what CreateIncidentPage computed and forwarded without
// exercising the form's own (separately-tested) query/upload/validation logic.
vi.mock("../../components/create/CreateTicketForm", () => ({
  CreateTicketForm: (props: { inboxPath: string }) => {
    createTicketFormSpy.latestProps = props;
    createTicketFormSpy.renderCount += 1;
    return <div data-testid="create-ticket-form-stub">{props.inboxPath}</div>;
  },
}));

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

function renderCreateIncidentPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const pageRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: CreateIncidentPage,
  });
  const routeTree = rootRoute.addChildren([pageRoute]);
  const router = createRouter({
    routeTree,
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
  vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  createTicketFormSpy.latestProps = undefined;
  createTicketFormSpy.renderCount = 0;
});

// CreateIncidentPage renders two header blocks (desktop `hidden lg:block` /
// mobile `lg:hidden`) that are both present simultaneously in jsdom since no
// real layout engine applies the responsive classes -- so "Raise New Ticket"
// and the breadcrumb labels are each expected to appear twice.
describe("CreateIncidentPage header + breadcrumbs", () => {
  it("renders the 'Raise New Ticket' title in both the desktop and mobile header blocks", async () => {
    renderCreateIncidentPage();

    const titles = await screen.findAllByText("Raise New Ticket");
    expect(titles.length).toBe(2);
  });

  it("renders the Overview / Inbox / Raise ticket breadcrumb trail in both header blocks", async () => {
    renderCreateIncidentPage();

    expect((await screen.findAllByText("Overview")).length).toBe(2);
    expect((await screen.findAllByText("Inbox")).length).toBe(2);
    // The final breadcrumb item has no `to`, so ImBreadcrumbs renders it as a
    // plain BreadcrumbPage (not a Link) -- still expected twice (once per header).
    expect((await screen.findAllByText("Raise ticket")).length).toBe(2);
  });

  it("points the Overview breadcrumb link at employeeHomePath() and the Inbox link at the computed inboxPath", async () => {
    renderCreateIncidentPage();

    const overviewLinks = await screen.findAllByRole("link", { name: "Overview" });
    for (const link of overviewLinks) {
      expect(link).toHaveAttribute("href", "/livelihood-ui/employee");
    }

    const inboxLinks = await screen.findAllByRole("link", { name: "Inbox" });
    for (const link of inboxLinks) {
      expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/inbox");
    }
  });

  it("renders the LanguageSwitcher action exactly once (desktop header only, not duplicated into the mobile header)", async () => {
    renderCreateIncidentPage();

    await screen.findAllByText("Raise New Ticket");
    // LanguageSwitcher's trigger button shows the current language's native
    // label ("English" per the fallback list in useLanguages) once resolved.
    const switcherButtons = await screen.findAllByRole("button", { name: /English/i });
    expect(switcherButtons.length).toBe(1);
  });
});

// CreateIncidentPage builds `inboxPath` as `${basePath}${IM_ROUTES.inbox}`
// where `basePath = /${contextPath()}` (contextPath defaults to "livelihood-ui"
// per shared/config/global-config.ts's CONTEXT_PATH default, unconfigured in
// this test's window.globalConfigs stub from src/test/setup.ts) and
// IM_ROUTES.inbox = "/employee/im/inbox" -- and forwards that single computed
// path to CreateTicketForm as its only prop.
describe("CreateIncidentPage -> CreateTicketForm wiring", () => {
  it("renders CreateTicketForm exactly once with the computed inboxPath prop", async () => {
    renderCreateIncidentPage();

    const stub = await screen.findByTestId("create-ticket-form-stub");
    expect(stub).toHaveTextContent("/livelihood-ui/employee/im/inbox");
    expect(createTicketFormSpy.latestProps?.inboxPath).toBe(
      "/livelihood-ui/employee/im/inbox",
    );
    expect(createTicketFormSpy.renderCount).toBe(1);
  });
});
