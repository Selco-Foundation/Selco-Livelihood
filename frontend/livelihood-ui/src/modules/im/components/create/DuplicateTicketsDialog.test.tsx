/**
 * Unit tests for DuplicateTicketsDialog (src/modules/im/components/create/DuplicateTicketsDialog.tsx).
 *
 * DuplicateTicketsDialog is a presentational modal rendered via `createPortal` into
 * `document.body`. It shows a static title/description/action-copy (all resolved through
 * `translateOr`, so with no i18n resources loaded every string falls back to its English
 * default), a list of "duplicate" tickets rendered as router `<Link>`s, and two buttons
 * ("Yes" / "No") that call the `onContinue` / `onCancel` callbacks passed in as props.
 *
 * The one piece of real logic worth exercising is the ticket list join: each ticket is
 * wrapped in its own `<span>` and a plain `", "` separator is appended only when the ticket
 * is not the last one in the array (`index < tickets.length - 1`). These tests cover that
 * separator logic for 0/1/2/3+ tickets, the generated `Link` hrefs (which depend on
 * `contextPath()` plus the ticket's id/tenantId), the portal placement, and the
 * continue/cancel button callbacks.
 *
 * Testing approach:
 * - No mocking of the component's own module is needed; nothing here talks to a real API,
 *   so no `vi.spyOn` on a service module is required.
 * - The component calls `useTranslate()` from `@/shared`, which needs a react-i18next
 *   context, so tests wrap it in a lightweight test-only i18next instance (no network /
 *   real translation resources), matching the pattern used across this suite. Because no
 *   resources are registered, every string exercises its `translateOr` fallback text.
 * - The component renders a `<Link>` from `@tanstack/react-router`, which requires a real
 *   router context to resolve `to` into an `href`. Tests build a minimal in-memory router
 *   (`createMemoryHistory` + `createRootRoute` + `createRouter`) and render through
 *   `RouterProvider`, following the convention used in sibling router-dependent tests
 *   (e.g. ImOverview.test.tsx) rather than mocking `Link` itself.
 * - `window.globalConfigs.getConfig` is stubbed globally in src/test/setup.ts to return
 *   `undefined`, so `contextPath()` resolves to its documented fallback, "livelihood-ui".
 */
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { DuplicateTicketsDialog } from "./DuplicateTicketsDialog";

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

function renderDialog(props: Partial<ComponentProps<typeof DuplicateTicketsDialog>> = {}) {
  const onContinue = vi.fn();
  const onCancel = vi.fn();
  const rootRoute = createRootRoute({
    component: () => (
      <DuplicateTicketsDialog
        tickets={[]}
        onContinue={onContinue}
        onCancel={onCancel}
        {...props}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  const result = render(
    <I18nextProvider i18n={createTestI18n()}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );

  return { ...result, onContinue, onCancel };
}

// The component renders its static copy (title, description, action prompt) through
// `translateOr(t, key, fallback)`. With no i18n resources registered, `t(key)` returns the
// key itself (an i18next-next "missing key" behavior), so `translateOr` always falls back
// to the English default text -- these are the strings asserted below.
describe("DuplicateTicketsDialog static copy", () => {
  it("renders the title, description and action prompt fallback text", async () => {
    renderDialog({ tickets: [] });

    expect(await screen.findByText("Potential Duplicate Tickets Found")).toBeInTheDocument();
    expect(
      screen.getByText("Similar tickets already exist for this asset and issue type."),
    ).toBeInTheDocument();
    expect(screen.getByText("Do you still want to create a new ticket?")).toBeInTheDocument();
  });

  it("renders Yes/No action buttons", async () => {
    renderDialog({ tickets: [] });

    expect(await screen.findByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });
});

// The dialog is rendered via `createPortal(..., document.body)` rather than inline in the
// React tree, so its content is attached directly to `document.body` instead of appearing
// inside the render container that `@testing-library/react` creates. This verifies the
// portal actually happens (a real runtime behavior, not just the JSX shape).
describe("DuplicateTicketsDialog portal placement", () => {
  it("renders its content into document.body, outside the render container", async () => {
    const { container } = renderDialog({ tickets: [] });

    const title = await screen.findByText("Potential Duplicate Tickets Found");
    expect(document.body).toContainElement(title);
    expect(container).not.toContainElement(title);
  });
});

// The ticket list is built from `tickets.map(...)`, with each ticket rendered as a
// `<Link to={`${basePath}/complaint/details/${ticketId}/${ticketTenantId}`}>`. `basePath`
// is derived from `contextPath()`, which (per src/test/setup.ts's default `getConfig`
// stub) falls back to "livelihood-ui".
describe("DuplicateTicketsDialog ticket links", () => {
  it("renders no links and just the label when the tickets list is empty", async () => {
    renderDialog({ tickets: [] });

    expect(await screen.findByText(/Existing tickets/)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders a link per ticket with an href built from contextPath, ticketId and ticketTenantId", async () => {
    renderDialog({
      tickets: [
        { ticketId: "TICKET-1", ticketTenantId: "tenant-a" },
        { ticketId: "TICKET-2", ticketTenantId: "tenant-b" },
      ],
    });

    const links = await screen.findAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/complaint/details/TICKET-1/tenant-a",
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/complaint/details/TICKET-2/tenant-b",
    );
    expect(links[0]).toHaveTextContent("TICKET-1");
    expect(links[1]).toHaveTextContent("TICKET-2");
  });

  it("opens ticket links in a new tab", async () => {
    renderDialog({ tickets: [{ ticketId: "TICKET-1", ticketTenantId: "tenant-a" }] });

    expect(await screen.findByRole("link")).toHaveAttribute("target", "_blank");
  });
});

// Real join/separator logic under test: `{index < tickets.length - 1 ? ", " : ""}` appends
// a comma-space after every ticket except the last one. These cases pin down the 0/1/2/3+
// ticket boundary behavior so a future refactor (e.g. swapping to `Array.join`) can't
// silently drop or duplicate separators.
describe("DuplicateTicketsDialog list separator logic", () => {
  it("adds no separator after a single ticket", async () => {
    renderDialog({ tickets: [{ ticketId: "SOLO-1", ticketTenantId: "tenant-a" }] });

    const paragraph = await screen.findByText(/Existing tickets/);
    expect(paragraph).toHaveTextContent("Existing tickets: SOLO-1");
    expect(paragraph.textContent).not.toContain(",");
  });

  it("joins exactly two tickets with a single comma-space separator", async () => {
    renderDialog({
      tickets: [
        { ticketId: "T-1", ticketTenantId: "tenant-a" },
        { ticketId: "T-2", ticketTenantId: "tenant-b" },
      ],
    });

    const paragraph = await screen.findByText(/Existing tickets/);
    // Exactly one comma should appear, between the two ticket ids and nowhere else.
    expect(paragraph.textContent).toBe("Existing tickets: T-1, T-2");
  });

  it("separates every ticket but omits a trailing separator for three or more tickets", async () => {
    renderDialog({
      tickets: [
        { ticketId: "T-1", ticketTenantId: "tenant-a" },
        { ticketId: "T-2", ticketTenantId: "tenant-b" },
        { ticketId: "T-3", ticketTenantId: "tenant-c" },
      ],
    });

    const paragraph = await screen.findByText(/Existing tickets/);
    expect(paragraph.textContent).toBe("Existing tickets: T-1, T-2, T-3");
  });
});

// The dialog delegates all interaction handling to its `onContinue`/`onCancel` props --
// it holds no internal open/close state of its own.
describe("DuplicateTicketsDialog action callbacks", () => {
  it("calls onContinue when the Yes button is clicked", async () => {
    const user = userEvent.setup();
    const { onContinue, onCancel } = renderDialog({ tickets: [] });

    await user.click(await screen.findByRole("button", { name: "Yes" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the No button is clicked", async () => {
    const user = userEvent.setup();
    const { onContinue, onCancel } = renderDialog({ tickets: [] });

    await user.click(await screen.findByRole("button", { name: "No" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
