import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import type { InboxRow } from "../../types/inbox";
import { ComplaintTable } from "./ComplaintTable";

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
    taskOwner: "-",
    sla: "-",
    endUser: "-",
    tenantId: "livelihood",
    potentialDuplicate: false,
    ...overrides,
  };
}

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
  resetAuthStore();
});

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

  it("shows the 'Days Remaining' SLA column header for an end user", async () => {
    seedAuthenticatedSession({ roles: [{ code: "EMPLOYEE" }] });
    renderTable([buildRow()]);
    expect(await screen.findByText("Days Remaining")).toBeInTheDocument();
  });

  it("shows the 'SLA Days Remaining' column header for staff roles", async () => {
    seedAuthenticatedSession({ roles: [{ code: "COMPLAINT_RESOLVER" }] });
    renderTable([buildRow()]);
    expect(await screen.findByText("SLA Days Remaining")).toBeInTheDocument();
  });

  it("renders '-' for a blank SLA value via the muted badge", async () => {
    renderTable([buildRow({ sla: "-" })]);
    await screen.findByRole("link", { name: "INC-1" });
    const badges = document.querySelectorAll(".livelihood-sla-badge-muted");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders a real SLA day count via the non-muted badge", async () => {
    renderTable([buildRow({ sla: "3" })]);
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(document.querySelector(".livelihood-sla-badge")).toBeInTheDocument();
  });

  it("clicking a row's ticket link doesn't throw", async () => {
    const user = userEvent.setup();
    renderTable([buildRow({ incidentId: "INC-1" })]);

    const link = await screen.findByRole("link", { name: "INC-1" });
    await user.click(link);

    expect(screen.getByRole("link", { name: "INC-1" })).toBeInTheDocument();
  });
});
