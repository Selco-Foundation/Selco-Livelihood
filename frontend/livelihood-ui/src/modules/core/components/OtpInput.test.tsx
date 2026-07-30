import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./OtpInput";

describe("OtpInput", () => {
  it("renders one input per digit, defaulting to length 4", () => {
    render(<OtpInput value="" onChange={vi.fn()} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("renders the configured length", () => {
    render(<OtpInput value="" onChange={vi.fn()} length={6} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("renders existing value digits into their respective boxes", () => {
    render(<OtpInput value="12" onChange={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs[0].value).toBe("1");
    expect(inputs[1].value).toBe("2");
    expect(inputs[2].value).toBe("");
  });

  it("calls onChange with the digit placed at the correct index", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "5");

    expect(onChange).toHaveBeenLastCalledWith("5");
  });

  it("strips non-digit characters from the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    await user.type(screen.getAllByRole("textbox")[0], "a");

    expect(onChange).not.toHaveBeenCalledWith("a");
  });

  it("auto-advances focus to the next box after entering a digit", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "1");

    expect(inputs[1]).toHaveFocus();
  });

  it("does not advance focus past the last box", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="123" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[3].focus();
    await user.type(inputs[3], "4");

    expect(inputs[3]).toHaveFocus();
  });

  it("moves focus to the previous box on backspace when the current box is empty", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="1" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[1].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });

  it("does not move focus on backspace when the current box already has a digit", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="12" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[1].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[1]).toHaveFocus();
  });

  it("does not move focus backwards from the first box", async () => {
    const user = userEvent.setup();
    render(<OtpInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole("textbox");
    inputs[0].focus();
    await user.keyboard("{Backspace}");

    expect(inputs[0]).toHaveFocus();
  });
});
