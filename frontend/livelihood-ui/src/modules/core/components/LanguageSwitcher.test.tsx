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

/**
 * Unit tests for `LanguageSwitcher`, the dropdown that lets a user switch the
 * app's locale (full-label button variant and a compact icon-only variant),
 * and persist the selection via `setLocale`, surfacing an error toast if that
 * call fails.
 *
 * Mocking strategy:
 * - `useLanguages` (from `@/shared`) fetches its list through `useQuery` and
 *   `fetchLanguages` (from `@/shared/api/mdms`), so every test spies on
 *   `mdmsApi.fetchLanguages` to control the language list, and the switcher is
 *   rendered inside a real `QueryClientProvider` (retries disabled) so that
 *   query actually resolves.
 * - `setLocale` (from `@/shared/i18n`) is spied on per-test rather than
 *   mocked at the module level, so tests can assert it was/wasn't called and
 *   can make it reject to exercise the error-toast path.
 * - A real `i18next` instance is created per test with an *empty* translation
 *   bundle (`createTestI18n`). Because no keys are loaded, `t(key)` always
 *   echoes the key back, so `translateOr` (used throughout the component)
 *   always resolves to its literal fallback string. This lets assertions rely
 *   on stable fallback text without needing to load real translation
 *   resources.
 * - `useLocaleStore` is a real zustand store; it is reset to `en_IN` after
 *   every test so state doesn't leak between cases.
 */
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

// `LanguageSwitcher` renders a dropdown trigger (full button with native-label
// text + chevron, or an icon-only button when `compact` is true) populated
// from `useLanguages()`. Selecting a menu item calls `handleSelect`, which
// no-ops if the code matches the current locale or a switch is already in
// flight, otherwise awaits `setLocale(code)` and shows an error toast (via
// `translateOr` fallback copy) if that call rejects. Preconditions: a
// `QueryClientProvider` (for `useLanguages`'s underlying query) and an
// `I18nextProvider` (for `useTranslate`) must wrap the component, which is
// exactly what `renderSwitcher` sets up.
describe("LanguageSwitcher", () => {
  // `current` is resolved by matching `languages` against the store's
  // `locale` (`en_IN` here), so the trigger button must show that entry's
  // `nativeLabel` ("English") rather than the first item in the list or the
  // fallback copy.
  it("shows the current language's native label in full mode", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
      { code: "kn_IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
    ]);
    useLocaleStore.setState({ locale: "en_IN" });

    renderSwitcher();

    await waitFor(() => expect(screen.getByText("English")).toBeInTheDocument());
  });

  // The dropdown content only mounts once the trigger button is clicked, so
  // the second language's native label ("ಕನ್ನಡ") is invisible until then;
  // this confirms `languages.map(...)` renders one `DropdownMenuItem` per
  // entry returned by `fetchLanguages`.
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

  // Picking a menu item whose `code` differs from the current locale should
  // reach the `await setLocale(code)` branch of `handleSelect` (as opposed to
  // the early-return guard exercised by the "selected again" test below).
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

  // `handleSelect` short-circuits (`code === currentLocale`) without calling
  // `setLocale` when the user re-picks the language that's already active.
  // With only one language configured, "English" renders twice once the menu
  // is open (once in the trigger button, once as the dropdown item), so
  // `getAllByText("English")[1]` targets the menu item specifically.
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

  // When `setLocale` rejects, `handleSelect`'s catch block calls
  // `toast.error` with `translateOr` fallback copy; asserting on the real
  // `toast` module (imported dynamically here to get the same instance the
  // component uses) confirms the failure path is wired up end-to-end.
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

  // When `compact` is true the trigger renders as an icon-only ghost button
  // (no native-label `<span>`), so the assertion is the *absence* of the
  // "English" text rather than its presence.
  it("renders a compact icon-only trigger in compact mode", async () => {
    vi.spyOn(mdmsApi, "fetchLanguages").mockResolvedValue([
      { code: "en_IN", label: "English", nativeLabel: "English" },
    ]);
    renderSwitcher(true);

    await waitFor(() => expect(screen.getByRole("button")).toBeInTheDocument());
    expect(screen.queryByText("English")).not.toBeInTheDocument();
  });
});
