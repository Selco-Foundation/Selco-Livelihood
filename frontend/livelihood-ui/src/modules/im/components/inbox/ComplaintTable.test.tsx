/**
 * Unit tests for `ComplaintTable`, the inbox rows table that renders a list of
 * `InboxRow` records as an HTML table: ticket-id link, end user, asset,
 * issue type, status, current owner, and an SLA badge column.
 *
 * Testing approach:
 * - The component reads `useAuthStore` (via `isEndUser`) to decide the SLA
 *   column header, and uses `@tanstack/react-router`'s `Link`/`useNavigate`
 *   for row/ticket navigation. Rather than mocking the router, tests mount a
 *   real in-memory `RouterProvider` (single root route rendering the table)
 *   so `Link` and row-click navigation behave exactly as they do in the app,
 *   without needing a browser or actual navigation to occur.
 * - The component calls `useTranslate`/`translateOr` for every visible label,
 *   so tests wrap the tree in a real `I18nextProvider` backed by an isolated
 *   i18next instance with empty `translations` resources. With no keys
 *   registered, `translateOr` always falls back to its provided default
 *   English string, which lets assertions target stable, human-readable text
 *   (e.g. "Days Remaining") instead of translation keys.
 * - `seedAuthenticatedSession`/`resetAuthStore` drive the real Zustand auth
 *   store directly (no mocking) so `isEndUser(user?.roles)` sees genuine
 *   role data per test, and the store is reset after each test to avoid
 *   leaking roles between cases.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import type { InboxRow } from "../../types/inbox";
import { ComplaintTable } from "./ComplaintTable";

// Builds an isolated i18next instance per test with no translation resources,
// so every `translateOr(t, key, fallback)` call in the component resolves to
// its English fallback string rather than an untranslated key.
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

// Produces a minimal valid InboxRow with sensible "empty" defaults (dashes
// for optional/unknown fields), so each test only needs to override the
// fields relevant to what it's asserting.
function buildRow(overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    incidentId: "INC-1",
    incidentType: "streetlight",
    assetLabel: "-",
    status: "PENDING_FOR_RESOLUTION",
    taskOwner: "-",
    sla: "-",
    endUser: "-",
    tenantId: "livelihood",
    potentialDuplicate: false,
    ...overrides,
  };
}

// Mounts ComplaintTable inside a real single-route TanStack Router tree
// (rather than a mocked router) so that the `Link` for each ticket id and the
// row-level `navigate()` call on click both resolve/execute for real.
function renderTable(data: InboxRow[]) {
  const rootRoute = createRootRoute({ component: () => <ComplaintTable data={data} /> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
}

afterEach(() => {
  // Auth store is a module-level singleton; clear seeded roles/session
  // between tests so role-dependent assertions (e.g. SLA header text)
  // don't leak from one test into the next.
  resetAuthStore();
});

// `ComplaintTable` renders one row per InboxRow: a linked ticket id (with an
// optional "Potential duplicate" note), end user, translated asset label,
// translated issue type, translated/truncated status, current owner, and an
// SLA badge (via the `SlaBadge` sub-component, which shows a muted badge for
// "-"/overdue values and a normal badge for an actual day count). The SLA
// column header text itself depends on whether the signed-in user is an end
// user (`isEndUser(user?.roles)`) or a staff/resolver role.
describe("ComplaintTable", () => {
  it("renders the ticket id as a link for each row", async () => {
    renderTable([buildRow({ incidentId: "INC-1" }), buildRow({ incidentId: "INC-2" })]);
    expect(await screen.findByRole("link", { name: "INC-1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "INC-2" })).toBeInTheDocument();
  });

  it("shows a potential-duplicate note when the row is flagged", async () => {
    renderTable([buildRow({ potentialDuplicate: true })]);
    expect(await screen.findByText("Potential duplicate")).toBeInTheDocument();
  });

  it("does not show a potential-duplicate note otherwise", async () => {
    renderTable([buildRow({ potentialDuplicate: false })]);
    await screen.findByRole("link", { name: "INC-1" });
    expect(screen.queryByText("Potential duplicate")).not.toBeInTheDocument();
  });

  // No auth session is seeded here, so `isEndUser` sees no matching staff
  // role and the component falls back to the end-user SLA header copy.
  // Seeding an "EMPLOYEE" role makes that end-user branch explicit.
  it("shows the 'Days Remaining' SLA column header for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    renderTable([buildRow()]);
    expect(await screen.findByText("Days Remaining")).toBeInTheDocument();
  });

  // A "COMPLAINT_RESOLVER" role is treated as staff by `isEndUser`, so the
  // header should switch to the SLA-days variant instead of the end-user one.
  it("shows the 'SLA Days Remaining' column header for staff roles", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINT_RESOLVER" }] });
    renderTable([buildRow()]);
    expect(await screen.findByText("SLA Days Remaining")).toBeInTheDocument();
  });

  // SlaBadge treats the literal "-" (and the overdue label) as "muted" states
  // rather than a real day count, rendering them with the
  // `.livelihood-sla-badge-muted` class instead of the normal badge class.
  it("renders '-' for a blank SLA value via the muted badge", async () => {
    renderTable([buildRow({ sla: "-" })]);
    await screen.findByRole("link", { name: "INC-1" });
    const badges = document.querySelectorAll(".livelihood-sla-badge-muted");
    expect(badges.length).toBeGreaterThan(0);
  });

  // Any other SLA value (a real remaining-day count) should render via the
  // non-muted `.livelihood-sla-badge` class instead.
  it("renders a real SLA day count via the non-muted badge", async () => {
    renderTable([buildRow({ sla: "3" })]);
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(document.querySelector(".livelihood-sla-badge")).toBeInTheDocument();
  });

  // The row's onClick calls `navigate(...).catch(() => {})`, and the ticket
  // link itself stops propagation so the click doesn't also trigger the row
  // navigation. With only a single root route mounted, real navigation to
  // the details path isn't expected to resolve to anything meaningful; this
  // test just guards against the click handler throwing or losing the link.
  it("clicking a row's ticket link doesn't throw", async () => {
    const user = userEvent.setup();
    renderTable([buildRow({ incidentId: "INC-1" })]);

    const link = await screen.findByRole("link", { name: "INC-1" });
    await user.click(link);

    expect(screen.getByRole("link", { name: "INC-1" })).toBeInTheDocument();
  });
});
