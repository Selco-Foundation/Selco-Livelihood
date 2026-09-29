import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/ui";
import { PasswordFormField } from "./PasswordFormField";

interface HarnessValues {
  password: string;
}

const harnessSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

function Harness({
  onSubmit = vi.fn(),
  disabled,
  headerExtra,
}: {
  onSubmit?: (values: HarnessValues) => void;
  disabled?: boolean;
  headerExtra?: React.ReactNode;
}) {
  const form = useForm<HarnessValues>({
    resolver: zodResolver(harnessSchema),
    defaultValues: { password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <PasswordFormField
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter password"
          disabled={disabled}
          headerExtra={headerExtra}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

describe("PasswordFormField", () => {
  it("renders the label", () => {
    render(<Harness />);
    expect(screen.getByText("Password")).toBeInTheDocument();
  });

  it("renders headerExtra next to the label when provided", () => {
    render(<Harness headerExtra={<span>Forgot password?</span>} />);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("renders the input as a password field by default", () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "password");
  });

  it("toggles the input to plain text when the visibility button is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();
  });

  it("toggles the input back to a password field when clicked again", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Show password" }));
    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "password");
  });

  it("updates the field value as the user types", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByPlaceholderText("Enter password"), "secret123");

    expect(screen.getByPlaceholderText("Enter password")).toHaveValue("secret123");
  });

  it("disables the input and the visibility toggle when disabled is true", () => {
    render(<Harness disabled />);

    expect(screen.getByPlaceholderText("Enter password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
  });

  it("shows a validation message when submitted empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with the entered value when valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("Enter password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ password: "secret123" }, expect.anything());
    });
  });
});
