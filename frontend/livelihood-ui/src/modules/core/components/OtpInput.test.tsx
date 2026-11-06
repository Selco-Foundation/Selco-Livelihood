import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { OtpInput } from "./OtpInput";

function StatefulOtpInput({ length }: { length?: number }) {
  const [value, setValue] = useState("");
  return <OtpInput value={value} onChange={setValue} length={length} />;
}

describe("OtpInput", () => {
  it("renders 4 inputs by default", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("renders a custom number of inputs when length is provided", () => {
    render(<OtpInput value="" onChange={vi.fn()} length={6} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("displays each digit of the value in its corresponding input", () => {
    render(<OtpInput value="12" onChange={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("1");
    expect(inputs[1]).toHaveValue("2");
    expect(inputs[2]).toHaveValue("");
    expect(inputs[3]).toHaveValue("");
  });

  it("calls onChange with the digit placed at the typed index, leaving other digits untouched", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    await user.type(screen.getAllByRole("textbox")[0], "5");

    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("strips non-digit characters before calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    await user.type(screen.getAllByRole("textbox")[0], "a");

    expect(onChange).not.toHaveBeenCalledWith("a");
  });

  it("auto-focuses the next input after typing a digit", async () => {
    const user = userEvent.setup();
    render(<StatefulOtpInput />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("1");

    expect(inputs[1]).toHaveFocus();
  });

  it("focuses the previous input when Backspace is pressed on an empty input", async () => {
    const user = userEvent.setup();
    render(<StatefulOtpInput />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[1]);
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });

  it("does not move focus when Backspace is pressed on the first input", async () => {
    const user = userEvent.setup();
    render(<StatefulOtpInput />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });

  it("does not move focus when Backspace is pressed on an input that still has a digit", async () => {
    const user = userEvent.setup();
    render(<StatefulOtpInput />);

    const inputs = screen.getAllByRole("textbox");
    await user.click(inputs[0]);
    await user.keyboard("1");
    await user.click(inputs[1]);
    await user.keyboard("2");
    await user.click(inputs[1]);
    await user.keyboard("{Backspace}");

    expect(inputs[1]).toHaveFocus();
  });
});
