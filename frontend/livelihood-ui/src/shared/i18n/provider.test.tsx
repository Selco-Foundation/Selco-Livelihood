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
