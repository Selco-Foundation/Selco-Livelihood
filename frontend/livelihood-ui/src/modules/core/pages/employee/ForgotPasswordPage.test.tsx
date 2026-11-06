import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    sendPasswordResetOtp: vi.fn(),
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
  employeeChangePasswordPath,
  employeeLoginPath,
  extractApiErrorMessage,
  sendPasswordResetOtp,
  tenantId,
} from "@/shared";
import { toast } from "@/ui";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

beforeEach(() => {
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());
  vi.mocked(sendPasswordResetOtp).mockReset();
  vi.mocked(extractApiErrorMessage).mockReset();
});

function renderPage() {
  return render(<ForgotPasswordPage />);
}

// The mobile number field wraps its <input> in a "+91" prefix <div> inside
// FormControl, so FormControl's id/aria-* land on that wrapper div instead of
// the input — breaking the label's `for` association (a real a11y bug, noted
// in the final report). Querying by the field's react-hook-form `name` works
// around it for these tests.
function getMobileNumberInput() {
  const input = document.querySelector<HTMLInputElement>('input[name="mobileNumber"]');
  if (!input) {
    throw new Error('input[name="mobileNumber"] not found');
  }
  return input;
}

describe("ForgotPasswordPage", () => {
  it("renders the title, mobile number field and a link back to login", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Forgot Password?" })).toBeInTheDocument();
    expect(getMobileNumberInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send OTP" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to login" })).toHaveAttribute(
      "href",
      employeeLoginPath(),
    );
  });

  it("shows a validation message and does not send an OTP for an invalid mobile number", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(getMobileNumberInput(), "12345");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(
      await screen.findByText("Enter a valid 10-digit mobile number"),
    ).toBeInTheDocument();
    expect(sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it("sends the OTP for a valid mobile number and navigates to the change-password page with it", async () => {
    const user = userEvent.setup();
    vi.mocked(sendPasswordResetOtp).mockResolvedValue(undefined);
    renderPage();

    await user.type(getMobileNumberInput(), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(sendPasswordResetOtp).toHaveBeenCalledWith({
      mobileNumber: "9876543210",
      tenantId: tenantId(),
    });
    await vi.waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        to: employeeChangePasswordPath(),
        search: { mobileNumber: "9876543210" },
      }),
    );
  });

  it("shows the failure toast using the extracted API error message when available", async () => {
    const user = userEvent.setup();
    vi.mocked(sendPasswordResetOtp).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue("Mobile number not registered");
    renderPage();

    await user.type(getMobileNumberInput(), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send OTP", {
        description: "Mobile number not registered",
      }),
    );
  });

  it("falls back to a generic message when the API error can't be extracted", async () => {
    const user = userEvent.setup();
    vi.mocked(sendPasswordResetOtp).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue(undefined);
    renderPage();

    await user.type(getMobileNumberInput(), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to send OTP", {
        description: "Check your mobile number and try again.",
      }),
    );
  });

  it("shows a loading label on the submit button while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveRequest!: () => void;
    vi.mocked(sendPasswordResetOtp).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () => resolve(undefined);
      }),
    );
    renderPage();

    await user.type(getMobileNumberInput(), "9876543210");
    await user.click(screen.getByRole("button", { name: "Send OTP" }));

    expect(screen.getByRole("button", { name: "Sending OTP..." })).toBeDisabled();

    resolveRequest();
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  });
});
