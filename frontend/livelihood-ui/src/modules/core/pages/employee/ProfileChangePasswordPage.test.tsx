import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    changePasswordInSession: vi.fn(),
  };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return {
    ...actual,
    toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  };
});

import {
  changePasswordInSession,
  employeeLoginPath,
  employeeProfilePath,
  useAuthStore,
  useJurisdictionStore,
} from "@/shared";
import { toast } from "@/ui";
import { ProfileChangePasswordPage } from "./ProfileChangePasswordPage";

const authedUser = { uuid: "u1", userName: "jdoe", roles: [] };
const initialAuthState = useAuthStore.getState();
const initialJurisdictionState = useJurisdictionStore.getState();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileChangePasswordPage />
    </QueryClientProvider>,
  );
}

// PasswordFormField wraps its <input> in a "show/hide" <div> inside
// FormControl, so FormControl's id/aria-* land on that wrapper div instead
// of the input — breaking the label's `for` association (a real a11y bug,
// noted in the final report). Querying by react-hook-form's `name` attribute
// works around it for these tests.
function getPasswordInput(name: "currentPassword" | "newPassword" | "confirmPassword") {
  const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!input) {
    throw new Error(`input[name="${name}"] not found`);
  }
  return input;
}

async function fillAllFields(user: ReturnType<typeof userEvent.setup>, values: {
  current?: string;
  next?: string;
  confirm?: string;
}) {
  if (values.current !== undefined) {
    await user.type(getPasswordInput("currentPassword"), values.current);
  }
  if (values.next !== undefined) {
    await user.type(getPasswordInput("newPassword"), values.next);
  }
  if (values.confirm !== undefined) {
    await user.type(getPasswordInput("confirmPassword"), values.confirm);
  }
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());
  vi.mocked(changePasswordInSession).mockReset();
  useAuthStore.setState({
    user: authedUser,
    accessToken: "token-1",
    employeeTenantId: "tenant-1",
  });
  useJurisdictionStore.setState({ boundaries: { district: "D1" } as never, hrmsUser: {} as never });
});

afterEach(() => {
  useAuthStore.setState(initialAuthState, true);
  useJurisdictionStore.setState(initialJurisdictionState, true);
});

describe("ProfileChangePasswordPage", () => {
  it("renders the three password fields and a cancel link back to the profile page", () => {
    renderPage();

    expect(getPasswordInput("currentPassword")).toBeInTheDocument();
    expect(getPasswordInput("newPassword")).toBeInTheDocument();
    expect(getPasswordInput("confirmPassword")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      employeeProfilePath(),
    );
  });

  it("keeps Save disabled until all three fields have a value", async () => {
    const user = userEvent.setup();
    renderPage();
    const saveButton = screen.getByRole("button", { name: "Change Password" });

    expect(saveButton).toBeDisabled();

    await fillAllFields(user, { current: "old-pass" });
    expect(saveButton).toBeDisabled();

    await fillAllFields(user, { next: "New-pass1" });
    expect(saveButton).toBeDisabled();

    await fillAllFields(user, { confirm: "New-pass1" });
    expect(saveButton).toBeEnabled();
  });

  it("shows a mismatch validation message and does not call changePasswordInSession", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAllFields(user, { current: "old-pass", next: "New-pass1", confirm: "Different1" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(changePasswordInSession).not.toHaveBeenCalled();
  });

  it("submits the change, then clears the session/jurisdiction and returns to login on confirm", async () => {
    const user = userEvent.setup();
    vi.mocked(changePasswordInSession).mockResolvedValue(undefined);
    renderPage();

    await fillAllFields(user, { current: "old-pass", next: "New-pass1", confirm: "New-pass1" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(changePasswordInSession).toHaveBeenCalledWith(
      {
        existingPassword: "old-pass",
        newPassword: "New-pass1",
        confirmPassword: "New-pass1",
        username: "jdoe",
        tenantId: "tenant-1",
      },
      "token-1",
      authedUser,
    );

    expect(await screen.findByText("Password updated successfully")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: employeeLoginPath() });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useJurisdictionStore.getState().boundaries).toBeNull();
  });

  it("does not submit when the employee session is incomplete", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ employeeTenantId: null });
    renderPage();

    await fillAllFields(user, { current: "old-pass", next: "New-pass1", confirm: "New-pass1" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(changePasswordInSession).not.toHaveBeenCalled();
    expect(screen.queryByText("Password updated successfully")).not.toBeInTheDocument();
  });

  it("shows the failure toast with no description, matching the page's current (undocumented) fallback", async () => {
    const user = userEvent.setup();
    vi.mocked(changePasswordInSession).mockRejectedValue(new Error("boom"));
    renderPage();

    await fillAllFields(user, { current: "old-pass", next: "New-pass1", confirm: "New-pass1" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update password"),
    );
    // Confirm this call carried no second (description) argument at all (see
    // the finding in the final report).
    expect(vi.mocked(toast.error).mock.calls.at(-1)).toHaveLength(1);
  });

  it("shows a loading label on the submit button while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveRequest!: () => void;
    vi.mocked(changePasswordInSession).mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () => resolve(undefined);
      }),
    );
    renderPage();

    await fillAllFields(user, { current: "old-pass", next: "New-pass1", confirm: "New-pass1" });
    await user.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.getByRole("button", { name: "Changing password..." })).toBeDisabled();

    resolveRequest();
    await vi.waitFor(() =>
      expect(screen.getByText("Password updated successfully")).toBeInTheDocument(),
    );
  });
});
