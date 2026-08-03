/**
 * Unit tests for Input (src/ui/components/ui/input.tsx).
 *
 * Input is a stock shadcn-style wrapper around a native `<input>`. It
 * destructures `className` and `type` off its props, forwards `type`
 * straight through, stamps `data-slot="input"`, and builds its final
 * `className` via `cn(baseClasses, focusClasses, ariaInvalidClasses, className)`
 * (clsx + tailwind-merge) -- every other prop (`value`, `onChange`,
 * `disabled`, `placeholder`, `aria-invalid`, `ref`, etc.) flows through
 * via the `{...props}` spread directly onto the DOM node. It has no
 * internal state, no context dependency, no i18n, and no routing, so
 * these tests render it directly with RTL's `render`/`screen` -- no
 * provider wrapper and no mocking of any kind (matching the Button/Badge
 * tests' approach for similarly "pure" presentational components in this
 * directory). `userEvent` is used for typing so the DOM's native
 * "controlled input" value/onChange cycle is exercised the same way a
 * real user interaction would trigger it.
 *
 * Behaviors/branches covered:
 *  - Renders a native `<input>` with `data-slot="input"` and the base
 *    Tailwind classes always present in the class string (height, width,
 *    border, padding, etc.).
 *  - `type` is forwarded to the native `type` attribute; omitting it
 *    leaves the input as the browser's implicit default text input.
 *  - Controlled usage: the displayed value reflects the `value` prop, and
 *    typing invokes the caller's `onChange` handler once per keystroke
 *    (native uncontrolled-then-controlled DOM behavior, not component
 *    logic -- Input does not intercept or transform the event).
 *  - `disabled` sets the native disabled attribute, which (combined with
 *    the always-present `disabled:*` classes baked into the component)
 *    prevents both typing and the `onChange` handler from firing.
 *  - `placeholder` and other arbitrary native attributes (`id`,
 *    `aria-label`, `maxLength`) are forwarded via the `{...props}` spread.
 *  - `aria-invalid` is forwarded as a plain attribute; the component's
 *    `aria-invalid:*` classes are always present in the class string and
 *    only take visual effect once the attribute is set (same pattern as
 *    Button's `disabled:*` classes).
 *  - `className` passed by the caller is merged (not replacing) with the
 *    component's base classes via `cn(...)`, including tailwind-merge's
 *    conflict resolution (a conflicting utility in `className` wins over
 *    the component's default).
 *  - `ref` forwarding flows through the `{...props}` spread onto the
 *    underlying native `<input>` element (Input is a plain function
 *    component, not `React.forwardRef`, but React 19 passes `ref` as a
 *    normal prop to function components, so this still works).
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./input";

// Input renders a plain native <input> unconditionally (no asChild/variant
// branching like Button/Badge), forwarding `type`, stamping `data-slot`,
// and composing its className from `cn(baseClasses, className)`.
describe("Input default rendering", () => {
  it("renders a native input with data-slot='input' and the base Tailwind classes", () => {
    render(<Input aria-label="Name" />);

    const input = screen.getByLabelText("Name");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveClass("h-9", "w-full", "rounded-md", "border", "border-input");
  });

  it("forwards the type prop to the native input attribute", () => {
    render(<Input type="password" aria-label="Password" />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("leaves the type attribute unset when type is omitted (implicit text default)", () => {
    render(<Input aria-label="Untyped" />);

    // No explicit type attribute is rendered; the browser treats this as text.
    expect(screen.getByLabelText("Untyped")).not.toHaveAttribute("type");
  });
});

// value/onChange are not handled by Input's own logic at all -- they pass
// straight through {...props} to the native <input>, so this exercises the
// standard React "controlled input" contract: the displayed value tracks
// the `value` prop, and each keystroke fires the native onChange event.
describe("Input controlled value/onChange", () => {
  it("displays the value passed via the value prop", () => {
    render(<Input aria-label="Controlled" value="hello" onChange={() => {}} />);

    expect(screen.getByLabelText("Controlled")).toHaveValue("hello");
  });

  it("invokes onChange with the updated value as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    // A minimal controlled wrapper so typed characters actually appear in
    // the DOM (a static `value` prop with no state update would otherwise
    // make userEvent.type's keystrokes visually inert).
    function Harness() {
      const [value, setValue] = useState("");
      return (
        <Input
          aria-label="Typed"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
        />
      );
    }
    render(<Harness />);

    await user.type(screen.getByLabelText("Typed"), "hi");

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, "h");
    expect(onChange).toHaveBeenNthCalledWith(2, "hi");
    expect(screen.getByLabelText("Typed")).toHaveValue("hi");
  });
});

// disabled is forwarded straight through to the native <input> via the
// {...props} spread; the component's `disabled:*` classes are always
// present in the class string and only take visual/behavioral effect once
// the native disabled attribute is set (browser behavior, not component
// logic) -- this is what blocks typing and onChange from firing.
describe("Input disabled state", () => {
  it("sets the native disabled attribute when disabled is true", () => {
    render(<Input aria-label="Disabled field" disabled />);

    expect(screen.getByLabelText("Disabled field")).toBeDisabled();
  });

  it("prevents typing and onChange from firing when disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input aria-label="Disabled field" disabled value="" onChange={onChange} />);

    await user.type(screen.getByLabelText("Disabled field"), "text");

    expect(onChange).not.toHaveBeenCalled();
  });
});

// Arbitrary native attributes/props (placeholder, id, maxLength,
// aria-invalid, event handlers) are forwarded verbatim via {...props}.
// aria-invalid is notable because the component's `aria-invalid:*`
// classes are baked into the static class string regardless of the
// attribute's value -- only the attribute itself communicates state,
// mirroring how `disabled:*` classes work above.
describe("Input attribute passthrough", () => {
  it("forwards placeholder, id, and maxLength to the native element", () => {
    render(<Input aria-label="Bio" placeholder="Tell us about yourself" id="bio-field" maxLength={50} />);

    const input = screen.getByLabelText("Bio");
    expect(input).toHaveAttribute("placeholder", "Tell us about yourself");
    expect(input).toHaveAttribute("id", "bio-field");
    expect(input).toHaveAttribute("maxLength", "50");
  });

  it("forwards aria-invalid as a plain attribute", () => {
    render(<Input aria-label="Email" aria-invalid="true" />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

// className is composed via `cn(baseClasses, className)` (clsx +
// tailwind-merge): a caller-supplied className is appended alongside the
// component's default classes, but a conflicting utility from the same
// class group overrides the default rather than both coexisting.
describe("Input className merging", () => {
  it("merges a non-conflicting custom className alongside the base classes", () => {
    render(<Input aria-label="Styled" className="my-custom-class" />);

    const input = screen.getByLabelText("Styled");
    expect(input).toHaveClass("my-custom-class");
    expect(input).toHaveClass("h-9"); // base class still present
  });

  it("lets a conflicting utility class in className win over the base default (tailwind-merge)", () => {
    render(<Input aria-label="Styled" className="h-20" />);

    const input = screen.getByLabelText("Styled");
    expect(input).toHaveClass("h-20");
    expect(input).not.toHaveClass("h-9");
  });
});

// ref flows through the {...props} spread onto the underlying native
// <input> element (Input is a plain function component receiving a `ref`
// prop, which React 19 treats identically to explicit forwardRef for this
// purpose).
describe("Input ref forwarding", () => {
  it("forwards a ref to the underlying input DOM node", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input aria-label="Ref target" ref={ref} defaultValue="abc" />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe("abc");
  });
});
