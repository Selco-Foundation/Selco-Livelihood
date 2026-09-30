import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
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
    searchCurrentUser: vi.fn(),
    updateUserProfile: vi.fn(),
    extractApiErrorMessage: vi.fn(),
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
  employeeProfileChangePasswordPath,
  extractApiErrorMessage,
  searchCurrentUser,
  updateUserProfile,
  useAuthStore,
} from "@/shared";
import { toast } from "@/ui";
import { ProfilePage } from "./ProfilePage";

const authedUser = { uuid: "u1", name: "Jane Doe", userName: "jdoe", roles: [] };
const initialAuthState = useAuthStore.getState();

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(searchCurrentUser).mockReset();
  vi.mocked(updateUserProfile).mockReset();
  vi.mocked(extractApiErrorMessage).mockReset();
  useAuthStore.setState({
    user: authedUser,
    accessToken: "token-1",
    employeeTenantId: "tenant-1",
  });
});

afterEach(() => {
  useAuthStore.setState(initialAuthState, true);
});

describe("ProfilePage", () => {
  it("shows a loading indicator while the profile is being fetched", () => {
    vi.mocked(searchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not fetch and stops loading when there is no authenticated session", async () => {
    useAuthStore.setState({ user: null, accessToken: null, employeeTenantId: null });
    renderPage();

    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());
    expect(searchCurrentUser).not.toHaveBeenCalled();
  });

  it("renders the loaded profile's name, mobile number and email", async () => {
    vi.mocked(searchCurrentUser).mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
      mobileNumber: "9876543210",
      emailId: "jane@example.com",
    });
    renderPage();

    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    expect(screen.getByLabelText(/^Name/)).toHaveValue("Jane Doe");
    expect(screen.getByText("Mobile No.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("9876543210")).toBeDisabled();
    expect(screen.getByLabelText(/^Email/)).toHaveValue("jane@example.com");
    expect(searchCurrentUser).toHaveBeenCalledWith("u1", "tenant-1", "token-1", authedUser);
  });

  it("shows the load-failure toast using the extracted API error message when available", async () => {
    vi.mocked(searchCurrentUser).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue("Profile not found");
    renderPage();

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile", {
        description: "Profile not found",
      }),
    );
  });

  it("falls back to the generic message when the load-failure error can't be extracted", async () => {
    vi.mocked(searchCurrentUser).mockRejectedValue(new Error("boom"));
    vi.mocked(extractApiErrorMessage).mockReturnValue(undefined);
    renderPage();

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to load profile", {
        description: "Something went wrong. Please try again.",
      }),
    );
  });

  it("shows a validation message for an invalid email and does not call updateUserProfile", async () => {
    const user = userEvent.setup();
    vi.mocked(searchCurrentUser).mockResolvedValue({ uuid: "u1", name: "Jane Doe" });
    renderPage();
    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    await user.clear(screen.getByLabelText(/^Email/));
    // "foo@bar" satisfies the <input type="email"> field's own native HTML5
    // constraint validation (which would otherwise silently block the click
    // from ever reaching react-hook-form's submit handler), while still
    // failing this page's own dot-requiring regex.
    await user.type(screen.getByLabelText(/^Email/), "foo@bar");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it("disables Save until a field is actually changed, then saves and re-disables it on success", async () => {
    const user = userEvent.setup();
    vi.mocked(searchCurrentUser).mockResolvedValue({
      uuid: "u1",
      name: "Jane Doe",
      mobileNumber: "9876543210",
      emailId: "jane@example.com",
      photo: "photo-id",
    });
    vi.mocked(updateUserProfile).mockResolvedValue(null);
    renderPage();
    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.clear(screen.getByLabelText(/^Name/));
    await user.type(screen.getByLabelText(/^Name/), "Jane Smith");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(updateUserProfile).toHaveBeenCalledWith(
      {
        uuid: "u1",
        name: "Jane Smith",
        mobileNumber: "9876543210",
        emailId: "jane@example.com",
      },
      "tenant-1",
      "token-1",
      authedUser,
    );
    await vi.waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Profile updated successfully"),
    );
    expect(useAuthStore.getState().user?.name).toBe("Jane Smith");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeDisabled());
  });

  it("shows the update-failure toast with no description, matching the page's current (undocumented) fallback", async () => {
    const user = userEvent.setup();
    vi.mocked(searchCurrentUser).mockResolvedValue({ uuid: "u1", name: "Jane Doe" });
    vi.mocked(updateUserProfile).mockRejectedValue(new Error("boom"));
    renderPage();
    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    await user.clear(screen.getByLabelText(/^Name/));
    await user.type(screen.getByLabelText(/^Name/), "Jane Smith");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update profile"),
    );
    // Confirm this call carried no second (description) argument at all —
    // unlike the load-failure path above, this catch block passes no
    // description whatsoever (see the finding in the final report).
    expect(vi.mocked(toast.error).mock.calls.at(-1)).toHaveLength(1);
  });

  it("links to the change-password page", async () => {
    vi.mocked(searchCurrentUser).mockResolvedValue({ uuid: "u1", name: "Jane Doe" });
    renderPage();
    await vi.waitFor(() => expect(screen.queryByText("Loading...")).not.toBeInTheDocument());

    expect(screen.getByRole("link", { name: "Change Password" })).toHaveAttribute(
      "href",
      employeeProfileChangePasswordPath(),
    );
  });
});
