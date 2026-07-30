import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLocaleStore } from "@/shared";
import * as mdmsApi from "@/shared/api/mdms";
import * as i18nModule from "@/shared/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

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

function renderSwitcher(compact = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <LanguageSwitcher compact={compact} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  useLocaleStore.setState({ locale: "en_IN" });
});

describe("LanguageSwitcher", () => {
  it("shows the current language's native label in full mode", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);
    useLocaleStore.setState({ locale: "en_IN" });

    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
  });

  it("opens the dropdown and lists every language", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));

    expect(screen.getByText("ಕನ್ನಡ")).toBeInTheDocument();
  });

  it("calls setLocale when a different language is selected", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);
    const setLocaleSpy = vi.spyOn(i18nModule, "setLocale").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("ಕನ್ನಡ"));

    expect(setLocaleSpy).toHaveBeenCalledWith("kn_IN");
  });

  it("does not call setLocale when the current language is selected again", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
    ]);
    const setLocaleSpy = vi.spyOn(i18nModule, "setLocale").mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));
    await user.click(screen.getAllByText("English")[1]);

    expect(setLocaleSpy).not.toHaveBeenCalled();
  });

  it("shows an error toast when setLocale fails", async () => {
    const { toast } = await import("@/ui");
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);
    vi.spyOn(i18nModule, "setLocale").mockRejectedValue(new Error("network down"));
    const toastErrorSpy = vi.spyOn(toast, "error").mockImplementation(() => "");
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("ಕನ್ನಡ"));

    await waitFor(() => expect(toastErrorSpy).toHaveBeenCalled());
  });

  it("renders a compact icon-only trigger in compact mode", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
    ]);
    renderSwitcher(true);

    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    expect(screen.queryByText("English")).not.toBeInTheDocument();
  });
});
