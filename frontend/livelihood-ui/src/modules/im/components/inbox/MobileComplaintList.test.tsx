/**
 * Unit tests for MobileComplaintList (src/modules/im/components/inbox/MobileComplaintList.tsx).
 *
 * MobileComplaintList is a presentational card-list view of `InboxRow` data used on
 * narrow viewports (the mobile counterpart to ComplaintTable). For each row it renders:
 *  - the incidentId as a heading
 *  - a "Potential duplicate" note, only when `row.potentialDuplicate` is true
 *  - End User / Asset / Issue Type / Current Status / Current Owner detail rows, each
 *    resolved via `translateOr`/`translateDetailValue` (falling back to the raw value
 *    when no translation key matches, since the test i18n instance has empty resources)
 *  - an SLA label that reads "Days Remaining" for end users (isEndUser(user?.roles) true,
 *    e.g. an EMPLOYEE/COMPLAINANT-only role set) vs "SLA Days Remaining" for staff roles
 *  - clicking the card calls `navigate({ to: <basePath>/complaint/details/:incidentId/:tenantId })`
 *
 * Testing approach:
 *  - `@tanstack/react-router` is mocked (keeping its real exports via importActual) so
 *    `useNavigate` returns a `vi.fn()` spy we can assert on directly, instead of needing a
 *    real RouterProvider/route tree just to observe a navigation intent.
 *  - A lightweight test-only i18next instance (via I18nextProvider) stands in for the app's
 *    real network-backed i18n provider, per repo convention; empty resources mean
 *    `translateOr` falls back to its provided default/raw string, which is what's asserted.
 *  - The auth store (`useAuthStore`) is a real zustand store seeded via the shared
 *    `seedAuthenticatedSession`/`resetAuthStore` test mocks rather than mocked directly,
 *    matching sibling tests (e.g. ComplaintTable.test.tsx).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import type { InboxRow } from "../../types/inbox";
import { MobileComplaintList } from "./MobileComplaintList";

// The component calls `.catch()` on the navigate() result, so the mock must resolve to
// a real promise (not just return undefined) or clicking a card throws in jsdom.
const navigateMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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

function buildRow(overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    incidentId: "INC-1",
    incidentType: "streetlight",
    assetLabel: "-",
    status: "PENDING_FOR_RESOLUTION",
    taskOwner: "Owner Name",
    sla: "3",
    endUser: "Jane Doe",
    tenantId: "livelihood",
    potentialDuplicate: false,
    ...overrides,
  };
}

function renderList(data: InboxRow[]) {
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <MobileComplaintList data={data} />
    </I18nextProvider>,
  );
}

afterEach(() => {
  resetAuthStore();
  navigateMock.mockClear();
});

// MobileComplaintList: renders a Card per InboxRow with its identifying/detail fields.
// Expects an InboxRow array as `data`; no auth session or router context is required for
// the rendered text itself (only the SLA label and the click-navigate behavior depend on
// auth state / router, covered in their own describe blocks below).
describe("MobileComplaintList", () => {
  it("renders the incidentId and detail rows for each card", async () => {
    renderList([
      buildRow({
        incidentId: "INC-1",
        endUser: "Jane Doe",
        taskOwner: "Owner Name",
        sla: "3",
      }),
    ]);

    expect(await screen.findByText("INC-1")).toBeInTheDocument();
    // Detail rows fall back to their raw value because the test i18n instance has no
    // translation resources loaded, exercising translateOr's/translateDetailValue's
    // fallback branch rather than an actual translation lookup.
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Owner Name")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("End User:")).toBeInTheDocument();
    expect(screen.getByText("Asset:")).toBeInTheDocument();
    expect(screen.getByText("Issue Type:")).toBeInTheDocument();
    expect(screen.getByText("Current Status:")).toBeInTheDocument();
    expect(screen.getByText("Current Owner:")).toBeInTheDocument();
  });

  it("renders a card for every row in the data array", async () => {
    renderList([buildRow({ incidentId: "INC-1" }), buildRow({ incidentId: "INC-2" })]);

    expect(await screen.findByText("INC-1")).toBeInTheDocument();
    expect(screen.getByText("INC-2")).toBeInTheDocument();
  });

  // row.potentialDuplicate gates a destructive-styled note; it must be absent for
  // unflagged rows and present only for flagged ones.
  it("shows the potential-duplicate note only when the row is flagged", async () => {
    renderList([
      buildRow({ incidentId: "INC-1", potentialDuplicate: true }),
      buildRow({ incidentId: "INC-2", potentialDuplicate: false }),
    ]);

    await screen.findByText("INC-1");
    // Only one card is flagged, so exactly one note should render.
    expect(screen.getAllByText("Potential duplicate")).toHaveLength(1);
  });

  it("renders no potential-duplicate note when no rows are flagged", async () => {
    renderList([buildRow({ potentialDuplicate: false })]);

    await screen.findByText("INC-1");
    expect(screen.queryByText("Potential duplicate")).not.toBeInTheDocument();
  });

  // The SLA row label branches on isEndUser(user?.roles): a role set made up only of
  // EMPLOYEE/COMPLAINANT codes reads as an end user, anything else (e.g. a resolver
  // role) reads as staff.
  it("shows the 'Days Remaining' SLA label for an end-user role set", async () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    renderList([buildRow()]);

    expect(await screen.findByText(/Days Remaining:/)).toBeInTheDocument();
    expect(screen.queryByText(/SLA Days Remaining:/)).not.toBeInTheDocument();
  });

  it("shows the 'SLA Days Remaining' label for a staff role set", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINT_RESOLVER" }] });
    renderList([buildRow()]);

    expect(await screen.findByText(/SLA Days Remaining:/)).toBeInTheDocument();
  });

  // Clicking anywhere on the card should trigger navigation to the details page for
  // that specific row's incidentId/tenantId, built from the (stubbed) CONTEXT_PATH
  // config default of "livelihood-ui" via contextPath().
  it("navigates to the complaint details path for the clicked row", async () => {
    const user = userEvent.setup();
    renderList([buildRow({ incidentId: "INC-42", tenantId: "pb.amritsar" })]);

    const card = await screen.findByText("INC-42");
    await user.click(card);

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/livelihood-ui/employee/im/complaint/details/INC-42/pb.amritsar",
    });
  });

  it("navigates to the matching row's own path when multiple rows are rendered", async () => {
    const user = userEvent.setup();
    renderList([
      buildRow({ incidentId: "INC-1", tenantId: "livelihood" }),
      buildRow({ incidentId: "INC-2", tenantId: "livelihood" }),
    ]);

    await screen.findByText("INC-1");
    await user.click(screen.getByText("INC-2"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/livelihood-ui/employee/im/complaint/details/INC-2/livelihood",
    });
  });
});
