/**
 * Unit tests for OtpInput.
 *
 * OtpInput renders a row of single-character `<input>` boxes (one per digit
 * of `length`, default 4) that together represent one OTP string. It is a
 * fully controlled component: the boxes never hold their own state, they are
 * just a rendering of the `value` prop, and every keystroke is reported back
 * to the caller via `onChange` as the *full* recomposed OTP string (not just
 * the changed digit).
 *
 * These tests render the real component with real DOM inputs and drive it
 * with `@testing-library/user-event` typing/keyboard events -- no mocking is
 * needed beyond `vi.fn()` spies for `onChange`, since OtpInput has no
 * external dependencies (no network, context, or i18n) and its behavior
 * (digit placement, non-digit filtering, auto-focus-advance, and
 * backspace-to-previous-box) is entirely observable through the rendered
 * inputs' values and focus state.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./OtpInput";

// OtpInput({ value, onChange, length = 4 }) splits `value` into `length`
// single-character digits (missing positions render as ""), renders one
// input box per digit, and reports the whole recomposed string back through
// `onChange` on every edit. It also manages focus movement between boxes:
// entering a digit advances to the next box, and Backspace on an empty box
// moves back to the previous one.
describe("OtpInput", () => {
  // `length` is an optional prop defaulting to 4 in the destructured signature,
  // so omitting it entirely must still produce exactly 4 boxes.
  it("renders one input per digit, defaulting to length 4", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  // `Array.from({ length }, ...)` drives the number of rendered boxes directly
  // off the `length` prop, so passing a non-default value must resize the row.
  it("renders the configured length", () => {
    render(<OtpInput value="" onChange={vi.fn()} length={6} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  // `value[index] ?? ""` means each box shows the character at its own
  // index and any index past the end of `value` renders empty, not undefined.
  it("renders existing value digits into their respective boxes", () => {
    render(<OtpInput value="12" onChange={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs[0].value).toBe("1");
    expect(inputs[1].value).toBe("2");
    expect(inputs[2].value).toBe("");
  });

  // setDigit rebuilds the full digits array and joins it, so onChange must
  // receive the complete OTP string with the new digit in its own slot, not
  // just the single typed character.
  it("calls onChange with the digit placed at the correct index", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "5");

    expect(onChange).toHaveBeenLastCalledWith("5");
  });

  // handleChange runs the raw input through `replace(/\D/g, "").slice(-1)`
  // before calling setDigit, so a non-digit character is filtered out
  // entirely and must never reach onChange as the new digit.
  it("strips non-digit characters from the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    await user.type(screen.getAllByRole("textbox")[0], "a");

    expect(onChange).not.toHaveBeenCalledWith("a");
  });

  // handleChange only focuses inputRefs.current[index + 1] when the stripped
  // digit is truthy AND index < length - 1, so a successful digit entry on a
  // box that isn't the last one must move focus forward.
  it("auto-advances focus to the next box after entering a digit", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "1");

    expect(inputs[1]).toHaveFocus();
  });

  // The `index < length - 1` guard in handleChange excludes the final box
  // (index 3 of the default length-4 layout), so typing there must leave
  // focus in place rather than trying to focus a non-existent next ref.
  it("does not advance focus past the last box", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="123" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[3].focus();
    await user.type(inputs[3], "4");

    expect(inputs[3]).toHaveFocus();
  });

  // handleKeyDown moves focus to inputRefs.current[index - 1] only when
  // Backspace is pressed and `digits[index]` is falsy (box is empty), so
  // backspacing on box 1 while it holds no digit must send focus back to box 0.
  it("moves focus to the previous box on backspace when the current box is empty", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="1" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[1].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });

  // handleKeyDown only moves focus back when `!digits[index]` is true, so
  // Backspace on a box that already holds a digit must leave focus where it
  // is (the DOM input's own default backspace/clear behavior still applies,
  // but no focus change should be triggered by OtpInput itself).
  it("does not move focus on backspace when the current box already has a digit", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="12" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[1].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[1]).toHaveFocus();
  });

  // The `index > 0` guard in handleKeyDown excludes box 0, so Backspace on an
  // empty first box has no previous box to focus and must be a no-op.
  it("does not move focus backwards from the first box", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[0].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });
});
