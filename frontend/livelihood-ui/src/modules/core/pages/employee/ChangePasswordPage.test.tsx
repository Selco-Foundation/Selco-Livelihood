import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockSearch: { mobileNumber?: string } = { mobileNumber: "9876543210" };

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    sendPasswordResetOtp: vi.fn(),
    resetPasswordWithOtp: vi.fn(),
    extractApiErrorMessage: vi.fn(),
    useLoginBannerImages: vi.fn().mockReturnValue([]),
  };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return {
    ...actual,
    toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
    LanguageSwitcher: () => null,
  };
});

import {
  employeeLoginPath,
  extractApiErrorMessage,
  resetPasswordWithOtp,
  sendPasswordResetOtp,
  tenantId,
} from "@/shared";
import { toast } from "@/ui";
import { ChangePasswordPage } from "./ChangePasswordPage";

function renderPage() {
  return render(<ChangePasswordPage />);
}

function getOtpBoxes() {
  return screen.getAllByRole("textbox").slice(0, 4);
}

// PasswordFormField wraps its <input> in a "show/hide" <div> inside
// FormControl, so FormControl's id/aria-* land on that wrapper div instead
// of the input — breaking the label's `for` association (a real a11y bug,
// noted in the final report). Querying by react-hook-form's `name` attribute
// works around it for these tests.
function getPasswordInput(name: "newPassword" | "confirmPassword") {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) {
    throw new Error(`input[name="${name}"] not found`);
  }
  return input;
}

async function fillOtp(user: ReturnType<typeof userEvent.setup>, digits: string) {
  const boxes = getOtpBoxes();
  for (const [index, digit] of digits.split("").entries()) {
    await user.type(boxes[index], digit);
  }
}

beforeEach(() => {
  mockSearch = { mobileNumber: "9876543210" };
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());
  vi.mocked(sendPasswordResetOtp).mockReset();
  vi.mocked(resetPasswordWithOtp).mockReset();
  vi.mocked(extractApiErrorMessage).mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ChangePasswordPage", () => {
  it("renders the OTP boxes, username/password fields and the mobile number in the subtitle", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Reset Password" })).toBeInTheDocument();
    expect(screen.getByText("OTP sent to +91 - 9876543210")).toBeInTheDocument();
    expect(getOtpBoxes()).toHaveLength(4);
    expect(screen.getByLabelText(/^Username/)).toBeInTheDocument();
    expect(getPasswordInput("newPassword")).toBeInTheDocument();
    expect(getPasswordInput("confirmPassword")).toBeInTheDocument();
  });

  it("starts the resend button disabled with a 30 second cooldown, then enables it once the cooldown elapses", () => {
    vi.useFakeTimers();
    renderPage();

    expect(screen.getByRole("button", { name: "Resend OTP in 30 Seconds" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByRole("button", { name: "Resend OTP in 15 Seconds" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByRole("button", { name: "Resend OTP" })).toBeEnabled();
  });

  it("resends the OTP once the cooldown elapses, toasts success, and restarts the cooldown", async () => {
    vi.useFakeTimers();
    renderPage();
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    vi.useRealTimers();

    const user = userEvent.setup();
    vi.mocked(sendPasswordResetOtp).mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: "Resend OTP" }));

    expect(sendPasswordResetOtp).toHaveBeenCalledWith({
      mobileNumber: "9876543210",
      tenantId: tenantId(),
    });
    expect(toast.success).toHaveBeenCalledWith("OTP resent");
    expect(screen.getByRole("button", { name: "Resend OTP in 30 Seconds" })).toBeDisabled();
  });

  it("shows the resend failure toast falling back to the generic message when nothing can be extracted", async () => {
    vi.useFakeTimers();
    renderPage();
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    vi.useRealTimers();

    const user = userEvent.setup();
    vi.mocked(sendPasswordResetOtp).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue(undefined);

    await user.click(screen.getByRole("button", { name: "Resend OTP" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send OTP", {
        description: "Something went wrong. Please try again.",
      }),
    );
  });

  it("rejects submission with an invalid OTP without calling resetPasswordWithOtp", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^Username/), "jdoe");
    await user.type(getPasswordInput("newPassword"), "Passw0rd!");
    await user.type(getPasswordInput("confirmPassword"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(toast.error).toHaveBeenCalledWith("Enter the 4-digit OTP");
    expect(resetPasswordWithOtp).not.toHaveBeenCalled();
  });

  it("shows a mismatch validation message when the passwords don't match", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillOtp(user, "1234");
    await user.type(screen.getByLabelText(/^Username/), "jdoe");
    await user.type(getPasswordInput("newPassword"), "Passw0rd!");
    await user.type(getPasswordInput("confirmPassword"), "Different1!");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(resetPasswordWithOtp).not.toHaveBeenCalled();
  });

  it("submits the reset with the entered OTP and shows the success dialog, which returns to login on confirm", async () => {
    const user = userEvent.setup();
    vi.mocked(resetPasswordWithOtp).mockResolvedValue(undefined);
    renderPage();

    await fillOtp(user, "1234");
    await user.type(screen.getByLabelText(/^Username/), "  jdoe  ");
    await user.type(getPasswordInput("newPassword"), "Passw0rd!");
    await user.type(getPasswordInput("confirmPassword"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(resetPasswordWithOtp).toHaveBeenCalledWith({
      userName: "jdoe",
      newPassword: "Passw0rd!",
      confirmPassword: "Passw0rd!",
      otpReference: "1234",
      tenantId: tenantId(),
    });

    expect(await screen.findByText("Password updated successfully")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: employeeLoginPath() });
  });

  it("shows the submit failure toast falling back to the generic message when nothing can be extracted", async () => {
    const user = userEvent.setup();
    vi.mocked(resetPasswordWithOtp).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue(undefined);
    renderPage();

    await fillOtp(user, "1234");
    await user.type(screen.getByLabelText(/^Username/), "jdoe");
    await user.type(getPasswordInput("newPassword"), "Passw0rd!");
    await user.type(getPasswordInput("confirmPassword"), "Passw0rd!");
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update password", {
        description: "Something went wrong. Please try again.",
      }),
    );
    expect(screen.queryByText("Password updated successfully")).not.toBeInTheDocument();
  });
});
