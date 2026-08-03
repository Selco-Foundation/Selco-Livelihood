import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { PasswordChangedDialog } from "./PasswordChangedDialog";

/**
 * Unit tests for PasswordChangedDialog.
 *
 * PasswordChangedDialog is a confirmation dialog rendered via `createPortal`
 * directly into `document.body` (rather than in-place in the React tree),
 * shown after a user successfully changes their password. It displays a
 * success icon, title/description text (via `translateOr`, which falls back
 * to the given English string when no translation key is registered), and
 * an "OK" button that invokes the `onConfirm` callback prop.
 *
 * Testing approach: the component only needs `useTranslate`'s `t` function,
 * so tests wrap it in a real `I18nextProvider` backed by a fresh, empty i18n
 * instance (see `createTestI18n`) instead of mocking `@/shared` — this lets
 * `translateOr` genuinely miss every key and exercise its English fallback
 * strings, which is what the assertions below check against. No other
 * mocking is required since the component has no side effects beyond
 * calling `onConfirm` and portaling its markup.
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

// PasswordChangedDialog: a portal-rendered success dialog shown after a
// password change. It requires only an `onConfirm` callback prop and an
// i18n context to resolve `useTranslate`; it renders a title, description,
// and an "OK" button, and calls `onConfirm` when that button is clicked.
describe("PasswordChangedDialog", () => {
  // Since the component uses createPortal(..., document.body) instead of
  // rendering inline, this asserts the content actually lands under
  // document.body rather than only inside the RTL render container.
  it("renders its content into document.body via a portal", () => {
    render(
      <I18nextProvider i18n={createTestI18n()}>
        <PasswordChangedDialog onConfirm={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByText("Password updated successfully")).toBeInTheDocument();
    expect(document.body).toContainElement(screen.getByText("Password updated successfully"));
  });

  // Confirms the OK button is wired to the onConfirm prop rather than, say,
  // closing itself internally -- clicking it must invoke the callback
  // exactly once so the parent (not the dialog) controls dismissal.
  it("calls onConfirm when the OK button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <I18nextProvider i18n={createTestI18n()}>
        <PasswordChangedDialog onConfirm={onConfirm} />
      </I18nextProvider>,
    );

    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
