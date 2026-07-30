import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "@/ui";
import { PasswordFormField } from "./PasswordFormField";

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

describe("PasswordFormField", () => {
  it("renders as a password input by default", () => {
    const { container } = render(<TestHost />);
    expect(getPasswordInput(container)).toHaveAttribute("type", "password");
  });

  it("toggles to a text input when the show/hide button is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<TestHost />);

    await user.click(screen.getByRole("button", { name: /show password/i }));

    expect(getPasswordInput(container)).toHaveAttribute("type", "text");
  });

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

  it("disables both the input and the toggle button when disabled", () => {
    const { container } = render(<TestHost disabled />);
    expect(getPasswordInput(container)).toBeDisabled();
    expect(screen.getByRole("button", { name: /show password/i })).toBeDisabled();
  });
});
