import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LoginRouteSearch } from "../../routes";

const mockNavigate = vi.fn();
let mockSearch: LoginRouteSearch = {};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
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
    loginUser: vi.fn(),
    resolveQrLogin: vi.fn(),
    filterRolesForEmployeeTenant: vi.fn((user: unknown) => user),
    hydrateEmployeeJurisdictions: vi.fn(),
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
  employeeHomePath,
  filterRolesForEmployeeTenant,
  hydrateEmployeeJurisdictions,
  loginUser,
  resolveQrLogin,
  tenantId,
  useAuthStore,
  useJurisdictionStore,
} from "@/shared";
import { toast } from "@/ui";
import { LoginPage } from "./LoginPage";

function renderPage() {
  return render(<LoginPage />);
}

// PasswordFormField wraps its <input> in a "show/hide" <div> inside
// FormControl, so FormControl's id/aria-* land on that wrapper div instead
// of the input — breaking the label's `for` association (a real a11y bug,
// noted in the final report). Querying by react-hook-form's `name` attribute
// works around it for these tests.
function getPasswordInput() {
  const input = document.querySelector<HTMLInputElement>('input[name="password"]');
  if (!input) {
    throw new Error('input[name="password"] not found');
  }
  return input;
}

const initialAuthState = useAuthStore.getState();
const initialJurisdictionState = useJurisdictionStore.getState();

beforeEach(() => {
  mockSearch = {};
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());
  vi.mocked(loginUser).mockReset();
  vi.mocked(resolveQrLogin).mockReset();
  vi.mocked(hydrateEmployeeJurisdictions).mockReset();
  vi.mocked(filterRolesForEmployeeTenant).mockImplementation((user: unknown) => user as never);
  useAuthStore.setState(initialAuthState, true);
  useJurisdictionStore.setState(initialJurisdictionState, true);
});

afterEach(() => {
  useAuthStore.setState(initialAuthState, true);
  useJurisdictionStore.setState(initialJurisdictionState, true);
});

describe("LoginPage", () => {
  it("renders the welcome title and the username/password fields", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username/)).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forgot Password?" })).toBeInTheDocument();
  });

  it("shows required-field validation messages and does not call loginUser when submitted empty", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });

  describe("QR login prefill", () => {
    it("shows a resolving indicator, then prefills the username once resolveQrLogin resolves", async () => {
      mockSearch = { tenantId: "qr-tenant", facilityId: "qr-facility" };
      vi.mocked(resolveQrLogin).mockResolvedValue({ userName: "qr-user" });
      renderPage();

      expect(screen.getByText("Reading QR code details...")).toBeInTheDocument();
      expect(screen.getByLabelText(/^Username/)).toBeDisabled();

      await vi.waitFor(() =>
        expect(screen.queryByText("Reading QR code details...")).not.toBeInTheDocument(),
      );
      expect(screen.getByLabelText(/^Username/)).toHaveValue("qr-user");
      expect(resolveQrLogin).toHaveBeenCalledWith({
        tenantId: "qr-tenant",
        facilityId: "qr-facility",
      });
    });

    it("shows a sign-in failure toast when the QR code can't be resolved", async () => {
      mockSearch = { tenantId: "qr-tenant", facilityId: "qr-facility" };
      vi.mocked(resolveQrLogin).mockRejectedValue(new Error("not found"));
      renderPage();

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Sign in failed", {
          description: "We couldn't recognize this QR code. Please log in manually.",
        }),
      );
    });
  });

  describe("submitting", () => {
    function mockSuccessfulLogin() {
      vi.mocked(loginUser).mockResolvedValue({
        access_token: "access-token",
        refresh_token: "refresh-token",
        UserRequest: {
          uuid: "u1",
          name: "Jo",
          userName: "jo",
          tenantId: "tenant-1",
          roles: [{ code: "SOME_ROLE", tenantId: "tenant-1" }],
        },
      });
      vi.mocked(hydrateEmployeeJurisdictions).mockResolvedValue({
        hrmsUser: { code: "jo" } as never,
        boundaries: { district: "D1" } as never,
      });
    }

    it("logs in, stores the session/jurisdiction, toasts success and navigates home by default", async () => {
      const user = userEvent.setup();
      mockSuccessfulLogin();
      renderPage();

      await user.type(screen.getByLabelText(/^Username/), "  jo  ");
      await user.type(getPasswordInput(), "  secret  ");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await vi.waitFor(() => expect(toast.success).toHaveBeenCalledWith("Signed in successfully"));

      expect(loginUser).toHaveBeenCalledWith({
        username: "jo",
        password: "secret",
        tenantId: tenantId(),
      });
      expect(useAuthStore.getState().accessToken).toBe("access-token");
      expect(useAuthStore.getState().employeeTenantId).toBe("tenant-1");
      expect(useJurisdictionStore.getState().boundaries).toEqual({ district: "D1" });
      expect(mockNavigate).toHaveBeenCalledWith({ to: employeeHomePath() });
    });

    it("redirects to the decoded 'from' path when present in the search params", async () => {
      const user = userEvent.setup();
      mockSearch = { from: encodeURIComponent("/employee/some/path?x=1") };
      mockSuccessfulLogin();
      renderPage();

      await user.type(screen.getByLabelText(/^Username/), "jo");
      await user.type(getPasswordInput(), "secret");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await vi.waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/employee/some/path?x=1" }),
      );
    });


    it("shows the OAuth error description when the login request fails with one", async () => {
      const user = userEvent.setup();
      vi.mocked(loginUser).mockRejectedValue({
        response: { data: { error_description: "Invalid username or password" } },
      });
      renderPage();

      await user.type(screen.getByLabelText(/^Username/), "jo");
      await user.type(getPasswordInput(), "wrong");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Sign in failed", {
          description: "Invalid username or password",
        }),
      );
    });

    it("falls back to a generic credentials message when the login error has no description", async () => {
      const user = userEvent.setup();
      vi.mocked(loginUser).mockRejectedValue(new Error("network down"));
      renderPage();

      await user.type(screen.getByLabelText(/^Username/), "jo");
      await user.type(getPasswordInput(), "wrong");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      await vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Sign in failed", {
          description: "Check your credentials and try again.",
        }),
      );
    });

    it("shows a loading label and disables the submit button while the request is in flight", async () => {
      const user = userEvent.setup();
      let resolveLogin!: (value: unknown) => void;
      vi.mocked(loginUser).mockReturnValue(
        new Promise((resolve) => {
          resolveLogin = resolve;
        }) as never,
      );
      renderPage();

      await user.type(screen.getByLabelText(/^Username/), "jo");
      await user.type(getPasswordInput(), "secret");
      await user.click(screen.getByRole("button", { name: "Log in" }));

      expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled();

      resolveLogin({
        access_token: "at",
        UserRequest: { uuid: "u1", tenantId: "tenant-1", roles: [] },
      });
      await vi.waitFor(() => expect(toast.success).toHaveBeenCalled());
    });
  });
});
