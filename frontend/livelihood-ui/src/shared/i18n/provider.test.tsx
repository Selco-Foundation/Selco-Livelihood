import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../stores/auth-store";

const mockI18nInstance = vi.hoisted(() => ({ isInitialized: false }));
const mockInitI18n = vi.hoisted(() => vi.fn());

vi.mock("./index", () => ({
  i18n: mockI18nInstance,
  initI18n: (...args: unknown[]) => mockInitI18n(...args),
}));

import { I18nProvider } from "./provider";

describe("I18nProvider", () => {
  beforeEach(() => {
    mockI18nInstance.isInitialized = false;
    mockInitI18n.mockReset();
    mockInitI18n.mockResolvedValue(mockI18nInstance);
    useAuthStore.getState().clearSession();
    window.globalConfigs = { getConfig: () => undefined };
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("shows a loading state before initI18n resolves, then renders children", async () => {
    render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );

    expect(screen.getByText("Loading translations...")).toBeInTheDocument();
    expect(screen.queryByText("Child content")).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("Child content")).toBeInTheDocument());
    expect(screen.queryByText("Loading translations...")).not.toBeInTheDocument();
  });

  it("renders children immediately when the i18n instance is already initialized", () => {
    mockI18nInstance.isInitialized = true;

    render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();
    expect(screen.queryByText("Loading translations...")).not.toBeInTheDocument();
  });

  it("initializes i18n with the signed-in user's employee tenant when one is set", async () => {
    useAuthStore.getState().setSession({ accessToken: "token", employeeTenantId: "pb-tenant" });

    render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );

    await waitFor(() => expect(mockInitI18n).toHaveBeenCalledWith({ tenantId: "pb-tenant" }));
  });

  it("falls back to the configured state tenant when there's no signed-in employee tenant", async () => {
    render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );

    await waitFor(() => expect(mockInitI18n).toHaveBeenCalledWith({ tenantId: "livelihood" }));
  });

  it("re-initializes when the employee tenant changes", async () => {
    const { rerender } = render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );
    await waitFor(() => expect(mockInitI18n).toHaveBeenCalledTimes(1));

    useAuthStore.getState().setSession({ accessToken: "token", employeeTenantId: "new-tenant" });
    rerender(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );

    await waitFor(() =>
      expect(mockInitI18n).toHaveBeenCalledWith({ tenantId: "new-tenant" }),
    );
  });

  it("does not update state after being unmounted while initI18n is still pending", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveInit: (() => void) | undefined;
    mockInitI18n.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );

    const { unmount } = render(
      <I18nProvider>
        <div>Child content</div>
      </I18nProvider>,
    );
    unmount();

    resolveInit?.();
    await Promise.resolve();
    await Promise.resolve();

    const stateUpdateWarning = consoleErrorSpy.mock.calls.some((call) =>
      String(call[0]).includes("unmounted component"),
    );
    expect(stateUpdateWarning).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
