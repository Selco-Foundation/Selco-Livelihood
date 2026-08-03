/**
 * Unit tests for the I18nProvider component in src/shared/i18n/provider.tsx
 *
 * Covers:
 * - Shows a loading placeholder while initI18n() is resolving
 * - Renders children once initI18n() completes
 *
 * Approach: Rendered with @testing-library/react using i18nIndex.initI18n() mocks
 * to control initialization timing. No additional provider wrapper is needed as the
 * component itself wraps children with I18nextProvider once ready.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore } from "@/test/mocks/auth";
import * as i18nIndex from "./index";
import { I18nProvider } from "./provider";

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("I18nProvider", () => {
  /**
   * React Provider component that initializes i18n on mount and shows a loading state
   * until translations are ready. Calls initI18n() with the employeeTenantId (or default
   * state-level tenantId from global config) and renders a loading message until resolved.
   * Once ready, wraps children with react-i18next's I18nextProvider.
   */
  it("shows a loading placeholder before initI18n resolves", () => {
    vi.spyOn(i18nIndex, "initI18n").mockImplementation(() => new Promise(() => {}));

    render(
      <I18nProvider>
        <div>App Content</div>
      </I18nProvider>,
    );

    expect(screen.getByText(/Loading translations/i)).toBeInTheDocument();
    expect(screen.queryByText("App Content")).not.toBeInTheDocument();
  });

  it("renders children once initI18n resolves", async () => {
    vi.spyOn(i18nIndex, "initI18n").mockResolvedValue(i18nIndex.i18n);

    render(
      <I18nProvider>
        <div>App Content</div>
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByText("App Content")).toBeInTheDocument());
  });
});
