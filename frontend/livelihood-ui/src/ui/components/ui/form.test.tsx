/**
 * Unit tests for the Form family (src/ui/components/ui/form.tsx).
 *
 * This is the stock shadcn wrapper around react-hook-form (RHF):
 *  - `Form` is a bare re-export of RHF's `FormProvider` (no behavior of its
 *    own to test beyond "it is FormProvider" / "it makes context available").
 *  - `FormField` wraps RHF's `Controller` and additionally stashes the
 *    field's `name` in a React context (`FormFieldContext`) so descendant
 *    helper components can look it up without prop-drilling.
 *  - `useFormField` (exercised indirectly through FormLabel/FormControl/
 *    FormDescription/FormMessage, and directly in one test) reads
 *    `FormFieldContext` + `FormItemContext` + RHF's `useFormContext`/
 *    `useFormState` to derive `id`, `name`, the three generated DOM ids
 *    (`formItemId`, `formDescriptionId`, `formMessageId`) and the current
 *    `fieldState` (including `error`).
 *  - `FormItem` generates a fresh `id` via `React.useId()`, publishes it on
 *    `FormItemContext`, and renders a `<div data-slot="form-item">`.
 *  - `FormLabel` renders the shared `<Label>` with `htmlFor={formItemId}`
 *    and `data-error={!!error}`.
 *  - `FormControl` renders Radix's `Slot.Root` (so it merges its a11y props
 *    onto a single child instead of adding a wrapper element), wiring
 *    `id`, `aria-invalid`, and an `aria-describedby` that includes the
 *    message id only when there is an error.
 *  - `FormDescription` renders a `<p>` with `id={formDescriptionId}`.
 *  - `FormMessage` renders the RHF error message when one exists, else falls
 *    back to its `children`, else renders nothing (returns null) when both
 *    are absent.
 *
 * Testing approach: these components only ever make sense mounted inside a
 * real RHF form (`useForm()` + `<Form {...form}>`, i.e. `FormProvider`), so
 * every test renders a small real form through that provider rather than
 * mocking react-hook-form or React context directly -- mocking RHF's
 * internals would defeat the point of testing the wiring between this file
 * and RHF. No i18n/router/query-client wrapper is used: this module reads
 * no translations, does no routing, and fetches nothing. Validation errors
 * are produced by driving real RHF validation (a `required` rule plus
 * `form.trigger()`/`handleSubmit`), not by hand-constructing a fake
 * `fieldState`, so the tests also confirm the real error-message shape RHF
 * hands to `FormMessage`. Async assertions use `findBy*` because RHF's
 * validation and re-render are asynchronous.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./form";

// A minimal real form: one text field named "username" with a `required`
// validation rule, plus a submit button that drives RHF's handleSubmit path.
// This mirrors the actual shadcn usage pattern (`<Form {...form}>` around
// `<FormField>`s) and gives every helper component (FormItem/FormLabel/
// FormControl/FormDescription/FormMessage) real, RHF-derived context to read.
function TestForm({
  required,
  showDescription = false,
  messageChildren,
}: {
  required?: string;
  showDescription?: boolean;
  messageChildren?: string;
}) {
  const form = useForm<{ username: string }>({ defaultValues: { username: "" } });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="username"
          rules={required ? { required } : undefined}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <input {...field} />
              </FormControl>
              {showDescription && <FormDescription>Your public handle.</FormDescription>}
              <FormMessage>{messageChildren}</FormMessage>
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

// FormField wraps RHF's <Controller> and publishes `name` on FormFieldContext
// so FormLabel/FormControl/FormDescription/FormMessage can derive matching
// ids without any prop being passed to them directly. It requires a `control`
// (from useForm()) and a `name`, and its `render` prop receives RHF's `field`
// (value/onChange/onBlur/name/ref) to spread onto the actual input.
describe("FormField + FormItem + FormLabel wiring", () => {
  it("renders the label, connects it to the control via matching ids, and has no error initially", () => {
    render(<TestForm />);

    const label = screen.getByText("Username");
    const input = screen.getByRole("textbox");

    // FormLabel's htmlFor and FormControl's id are both derived from the same
    // FormItem-generated id (`${id}-form-item`), so they must match exactly.
    expect(label).toHaveAttribute("for", input.id);
    expect(label).toHaveAttribute("data-error", "false");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("uses Slot.Root for FormControl, so the <input> itself carries the wiring (no wrapper element)", () => {
    render(<TestForm />);

    const input = screen.getByRole("textbox");
    // FormControl renders Slot.Root with a single <input> child; Slot merges
    // props onto that child rather than introducing an extra DOM node.
    expect(input.tagName).toBe("INPUT");
    expect(input.parentElement?.tagName).not.toBe("SPAN");
  });
});

// FormDescription renders a <p id={formDescriptionId}>; FormControl's
// aria-describedby always includes that id (whether or not an error is also
// present), so an input is always described by its FormDescription when one
// is rendered.
describe("FormDescription wiring", () => {
  it("wires FormControl's aria-describedby to the FormDescription's id when there is no error", () => {
    render(<TestForm showDescription />);

    const input = screen.getByRole("textbox");
    const description = screen.getByText("Your public handle.");

    expect(description.tagName).toBe("P");
    expect(input.getAttribute("aria-describedby")).toBe(description.id);
  });
});

// FormMessage renders the RHF field error's message when `fieldState.error`
// is set; this only happens after validation has actually run and failed
// (RHF starts with no error state on initial render).
describe("FormMessage with a validation error", () => {
  it("renders nothing when there is no error and no children", () => {
    render(<TestForm />);

    // FormMessage returns null when `body` (error message or children) is
    // falsy, so no [data-slot="form-message"] element should exist at all.
    expect(document.querySelector('[data-slot="form-message"]')).not.toBeInTheDocument();
  });

  it("renders its children as a fallback message when there is no error", () => {
    render(<TestForm messageChildren="Pick a unique handle." />);

    expect(screen.getByText("Pick a unique handle.")).toBeInTheDocument();
  });

  it("renders the RHF error message (not the static children) once required-field validation fails, and marks the label/control as errored", async () => {
    const user = userEvent.setup();
    // A `required` rule with a string message is the condition under test:
    // submitting the empty field must produce a `fieldState.error.message`
    // equal to that string, which FormMessage then renders in place of any
    // static `children` it was given.
    render(<TestForm required="Username is required" messageChildren="Pick a unique handle." />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    // FormMessage prefers the RHF error message over its static children.
    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.queryByText("Pick a unique handle.")).not.toBeInTheDocument();

    // FormLabel/FormControl re-derive `error` from the same fieldState, so
    // both should now reflect the errored state.
    expect(screen.getByText("Username")).toHaveAttribute("data-error", "true");
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("includes the message id in aria-describedby once an error is present (in addition to the description id)", async () => {
    const user = userEvent.setup();
    render(<TestForm required="Username is required" showDescription />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const errorMessage = await screen.findByText("Username is required");
    const description = screen.getByText("Your public handle.");
    const input = screen.getByRole("textbox");

    // FormControl's aria-describedby is `${descriptionId} ${messageId}` only
    // when `error` is truthy; verify both ids are present together.
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toContain(description.id);
    expect(describedBy).toContain(errorMessage.id);
  });

  it("clears the error message once the field is corrected and revalidated", async () => {
    const user = userEvent.setup();
    render(<TestForm required="Username is required" />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Username is required")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "alice");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    // RHF clears fieldState.error once the required rule is satisfied again,
    // so FormMessage should stop rendering the error paragraph.
    expect(screen.queryByText("Username is required")).not.toBeInTheDocument();
  });
});

// useFormField is the shared hook behind every Form* helper. It calls RHF's
// useFormContext(), which returns the ambient FormContext value (null when no
// FormProvider/<Form> ancestor exists). Because FormFieldContext's default
// value is a plain object (`{} as FormFieldContextValue`, which is always
// truthy), the hook's own `if (!fieldContext) throw ...` guard can never
// actually fire -- so what surfaces instead is a TypeError from destructuring
// `useFormContext()`'s null return, thrown the moment any Form* helper is
// rendered with no enclosing <Form> at all.
describe("useFormField error handling", () => {
  it("throws when a Form* helper is rendered outside of a <Form>/FormProvider ancestor", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      render(
        <FormItem>
          <FormLabel>Orphan label</FormLabel>
        </FormItem>,
      ),
    ).toThrow();

    consoleErrorSpy.mockRestore();
  });

  it("is only usable through the Form* components in practice (documented via a passing in-context call)", () => {
    // Direct, isolated sanity check that useFormField itself (not just the
    // components built on it) resolves id/formItemId correctly when called
    // from within a real <Form>/FormField/FormItem tree.
    let captured: { formItemId: string; error: unknown } | undefined;

    function Capture() {
      captured = useFormField();
      return null;
    }

    function Harness() {
      const form = useForm<{ username: string }>({ defaultValues: { username: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="username"
            render={() => (
              <FormItem>
                <Capture />
              </FormItem>
            )}
          />
        </Form>
      );
    }

    render(<Harness />);

    expect(captured?.formItemId).toMatch(/-form-item$/);
    expect(captured?.error).toBeUndefined();
  });
});
