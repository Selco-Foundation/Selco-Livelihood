/**
 * Unit tests for TicketSubmittedDialog (src/modules/im/components/create/TicketSubmittedDialog.tsx).
 *
 * TicketSubmittedDialog is a presentational confirmation modal rendered via `createPortal`
 * into `document.body`, shown after a ticket has been successfully created. It has no
 * internal state and no API calls -- it renders the incident/ticket id it receives as a
 * prop, static title/description copy (all resolved through `translateOr`, so with no i18n
 * resources loaded every string falls back to its English default), and two router `<Link>`s:
 * "View inbox" (to the `inboxPath` prop) and "Go to home" (to `employeeHomePath()`, which
 * resolves via `contextPath()`).
 *
 * Behaviors/branches verified:
 * - The confirmation title, description copy and the given `incidentId` are rendered.
 * - The dialog's content is attached to `document.body` via `createPortal`, not inside the
 *   render container (real portal runtime behavior, not just JSX shape).
 * - The "View inbox" link's href reflects the `inboxPath` prop verbatim (it is passed
 *   straight through to `<Link to={inboxPath}>`, no transformation).
 * - The "Go to home" link's href is built from `employeeHomePath()`, which depends on
 *   `contextPath()` -- exercised both with the default stubbed config (fallback
 *   "livelihood-ui", per src/test/setup.ts) and with a custom `window.globalConfigs`
 *   override, to prove the path is computed rather than hardcoded.
 *
 * Testing approach:
 * - No mocking of the component's own module, nor any `vi.spyOn` on a service module, is
 *   needed -- the component performs no API/service calls.
 * - The component calls `useTranslate()` from `@/shared`, which requires a react-i18next
 *   context, so tests wrap it in a lightweight test-only i18next instance (no network /
 *   real translation resources), matching the pattern used across this suite
 *   (see DuplicateTicketsDialog.test.tsx / PasswordChangedDialog.test.tsx). Because no
 *   resources are registered, every string exercises its `translateOr` fallback text.
 * - The component renders `<Link>` from `@tanstack/react-router`, which needs a real router
 *   context to resolve `to` into an `href`. Tests build a minimal in-memory router
 *   (`createMemoryHistory` + `createRootRoute` + `createRouter`) and render through
 *   `RouterProvider`, rather than mocking `Link` itself.
 * - `window.globalConfigs.getConfig` is stubbed globally in src/test/setup.ts to return
 *   `undefined`, so `contextPath()` (and therefore `employeeHomePath()`) resolves to its
 *   documented fallback, "livelihood-ui", unless a test overrides it.
 */
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import type { ComponentProps } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import { TicketSubmittedDialog } from "./TicketSubmittedDialog";

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

function renderDialog(props: Partial<ComponentProps<typeof TicketSubmittedDialog>> = {}) {
  const rootRoute = createRootRoute({
    component: () => (
      <TicketSubmittedDialog
        incidentId="INC-1001"
        inboxPath="/livelihood-ui/employee/im/inbox"
        {...props}
      />
    ),
  });
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
  // Some tests below override the globally stubbed window.globalConfigs (see
  // src/test/setup.ts) to exercise a non-default contextPath; restore the default stub so
  // later test files aren't affected by state leaking across files.
  window.globalConfigs = { getConfig: () => undefined };
});

// The dialog's static copy (title, ticket-number label, and description) is rendered through
// `translateOr(t, key, fallback)`. With no i18n resources registered, `t(key)` returns the
// key itself, so `translateOr` always falls back to its English default text. The
// `incidentId` prop is interpolated verbatim next to the ticket-number label.
describe("TicketSubmittedDialog static copy and ticket id", () => {
  it("renders the confirmation title and description fallback text", async () => {
    renderDialog();

    expect(await screen.findByText("Ticket Submitted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your ticket has been registered. You can track the ticket status by logging into this application again",
      ),
    ).toBeInTheDocument();
  });

  it("renders the given incidentId next to the ticket number label", async () => {
    renderDialog({ incidentId: "INC-2024-777" });

    const paragraph = await screen.findByText(/Ticket No\./);
    expect(paragraph).toHaveTextContent("Ticket No. INC-2024-777");
  });
});

// The dialog is rendered via `createPortal(..., document.body)` rather than inline in the
// React tree, so its content is attached directly to `document.body` instead of appearing
// inside the render container that `@testing-library/react` creates. This verifies the
// portal actually happens (a real runtime behavior, not just the JSX shape).
describe("TicketSubmittedDialog portal placement", () => {
  it("renders its content into document.body, outside the render container", async () => {
    const { container } = renderDialog();

    const title = await screen.findByText("Ticket Submitted");
    expect(document.body).toContainElement(title);
    expect(container).not.toContainElement(title);
  });
});

// "View inbox" wraps a `<Link to={inboxPath}>` -- the prop is passed straight through with
// no transformation, so the rendered href should equal the given `inboxPath` verbatim.
describe("TicketSubmittedDialog view inbox link", () => {
  it("builds the View inbox link href directly from the inboxPath prop", async () => {
    renderDialog({ inboxPath: "/livelihood-ui/employee/im/inbox" });

    const link = await screen.findByRole("link", { name: "View inbox" });
    expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/inbox");
  });

  it("reflects a different inboxPath value in the link href", async () => {
    renderDialog({ inboxPath: "/other-ctx/employee/im/inbox" });

    const link = await screen.findByRole("link", { name: "View inbox" });
    expect(link).toHaveAttribute("href", "/other-ctx/employee/im/inbox");
  });
});

// "Go to home" wraps a `<Link to={employeeHomePath()}>`. `employeeHomePath()` builds
// `/${contextPath()}/employee`, and `contextPath()` reads `window.globalConfigs.getConfig`.
// src/test/setup.ts stubs that to return undefined by default, so contextPath() falls back
// to "livelihood-ui" -- these two cases pin both the default fallback and a configured
// override, proving the href is genuinely computed rather than hardcoded.
describe("TicketSubmittedDialog go to home link", () => {
  it("builds the Go to home link href using the default fallback contextPath", async () => {
    renderDialog();

    const link = await screen.findByRole("link", { name: "Go to home" });
    expect(link).toHaveAttribute("href", "/livelihood-ui/employee");
  });

  it("builds the Go to home link href using a configured contextPath override", async () => {
    window.globalConfigs = {
      getConfig: (key: string) => (key === "CONTEXT_PATH" ? "custom-ctx" : undefined),
    };

    renderDialog();

    const link = await screen.findByRole("link", { name: "Go to home" });
    expect(link).toHaveAttribute("href", "/custom-ctx/employee");
  });
});
