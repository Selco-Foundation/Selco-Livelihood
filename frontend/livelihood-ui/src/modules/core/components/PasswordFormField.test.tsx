/**
 * Unit tests for PasswordFormField.
 *
 * PasswordFormField wraps an RHF-controlled `Input` (via the shadcn-style
 * `FormField`/`FormItem`/`FormControl` primitives from "@/ui") with a
 * show/hide toggle button. The toggle flips local `showPassword` state,
 * which drives both the input's `type` ("password" vs "text") and the
 * eye/eye-off icon + aria-label shown on the button.
 *
 * Testing approach:
 * - The component calls `useTranslate()` and `translateOr(...)` for the
 *   toggle button's aria-label, so every test renders through a real
 *   `I18nextProvider` backed by an isolated i18next instance with empty
 *   translation resources. `translateOr` is expected to fall back to its
 *   given English default ("Show password" / "Hide password") when a key
 *   is missing, so no i18n mocking is needed — the fallback strings are
 *   asserted on directly.
 * - Because the field must be driven by react-hook-form (it renders via
 *   `FormField`'s `render` prop and needs a `control`), tests go through a
 *   `TestHost` that wires up `useForm` + the `Form` provider rather than
 *   mounting `PasswordFormField` in isolation.
 * - No mocking of the component itself is needed; behavior is verified via
 *   real DOM interactions (clicking the toggle button) and querying the
 *   rendered input/button.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "@/ui";
import { PasswordFormField } from "./PasswordFormField";

// Isolated i18next instance per test render, with no translation resources
// loaded — this forces PasswordFormField's `translateOr(t, key, fallback)`
// calls to resolve to their English fallback strings, which is what the
// assertions below match against (e.g. /show password/i).
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

function TestHost({ disabled }: { disabled?: boolean }) {
  const form = useForm<{ password: string }>({ defaultValues: { password: "" } });
  return (
    <I18nextProvider i18n={createTestI18n()}>
      <Form {...form}>
        <PasswordFormField control={form.control} name="password" label="Password" disabled={disabled} />
      </Form>
    </I18nextProvider>
  );
}

// FormControl (shadcn) applies its id/aria-* props to PasswordFormField's own
// wrapping <div className="relative">, not directly to the <input> — so
// `htmlFor` never resolves to a labellable element and getByLabelText can't
// find it. Query the input by its RHF-bound `name` attribute instead.
function getPasswordInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[name="password"]') as HTMLInputElement;
}

// PasswordFormField renders an RHF-controlled password input plus a toggle
// button that flips local `showPassword` state on click. That state drives
// three things in lockstep: the input's `type` attribute, the button's icon
// (Eye vs EyeOff), and the button's aria-label (via translateOr fallback).
// `disabled` is expected to propagate to both the input and the toggle
// button. These tests cover the default render, both directions of the
// toggle, the aria-label swap, and the disabled state.
describe("PasswordFormField", () => {
  it("renders as a password input by default", () => {
    const { container } = render(<TestHost />);
    expect(getPasswordInput(container)).toHaveAttribute("type", "password");
  });

  // Initial render has `showPassword === false`, so the toggle button's
  // accessible name is the "Show password" fallback; clicking it flips the
  // state to `true`, which should switch the input's `type` to "text".
  it("toggles to a text input when the show/hide button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestHost />);

    await user.click(screen.getByRole("button", { name: /show password/i }));

    expect(getPasswordInput(container)).toHaveAttribute("type", "text");
  });

  // After the first click the button's own aria-label has already flipped to
  // "Hide password" (per the describe-level note on translateOr fallbacks),
  // so the second query must match that new name to find the same button
  // and flip `showPassword` back to `false`.
  it("toggles back to password type on a second click", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestHost />);

    await user.click(screen.getByRole("button", { name: /show password/i }));
    await user.click(screen.getByRole("button", { name: /hide password/i }));

    expect(getPasswordInput(container)).toHaveAttribute("type", "password");
  });

  it("swaps the aria-label between show/hide as the state toggles", async () => {
    const user = userEvent.setup();
    render(<TestHost />);

    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });

  // `disabled` must reach both the underlying <Input> and the toggle
  // <button> (each gets its own `disabled` prop in the source), so both are
  // asserted on to guard against either one being wired up incorrectly.
  it("disables both the input and the toggle button when disabled", () => {
    const { container } = render(<TestHost disabled />);
    expect(getPasswordInput(container)).toBeDisabled();
    expect(screen.getByRole("button", { name: /show password/i })).toBeDisabled();
  });
});
