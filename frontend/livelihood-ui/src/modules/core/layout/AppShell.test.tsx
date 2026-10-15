import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockUseRouterState = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useRouterState: (...args: unknown[]) => mockUseRouterState(...args),
  Link: ({
    to,
    children,
    onClick,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
  // AppShell doesn't do anything conditional around <Outlet /> — it's just a
  // static part of the layout — so it's stubbed out entirely to let the rest
  // of the tree (sidebar, nav, logout dialog) render and be exercised.
  Outlet: () => <div data-testid="outlet-stub" />,
}));

vi.mock("@/module-registry", () => ({ getModuleNavItems: vi.fn() }));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    useTranslate: vi.fn(),
    logoutUser: vi.fn(),
    // Avoids LanguageSwitcher (rendered in the mobile header) firing a real
    // network call through useQuery on every render.
    useLanguages: () => [{ code: "en_IN", label: "English", nativeLabel: "English" }],
  };
});

vi.mock("@/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/ui")>();
  return { ...actual, toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

import { getModuleNavItems } from "@/module-registry";
import {
  employeeLoginPath,
  logoutUser,
  tenantId,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { toast } from "@/ui";
import { AppShell } from "./AppShell";

function renderAppShell() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>,
  );
}

const HOME_PATH = "/livelihood-ui/employee";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTranslate).mockReturnValue({ t: (key: string) => key } as never);
  vi.mocked(getModuleNavItems).mockReturnValue([]);
  mockUseRouterState.mockReturnValue(HOME_PATH);
  mockNavigate.mockReturnValue(Promise.resolve());
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    employeeTenantId: null,
    isAuthenticated: false,
  });
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
});

describe("avatar initials", () => {
  it("uses the first two letters of the user's name, uppercased", () => {
    useAuthStore.setState({ user: { name: "john doe" } });

    renderAppShell();

    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("falls back to userName when name is absent", () => {
    useAuthStore.setState({ user: { userName: "jsmith" } });

    renderAppShell();

    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it('falls back to "LU" when there is no signed-in user', () => {
    renderAppShell();

    expect(screen.getByText("LU")).toBeInTheDocument();
  });
});

describe("nav items", () => {
  it("always includes an Overview item pointing at the employee home path", () => {
    renderAppShell();

    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).toHaveAttribute("href", HOME_PATH);
  });

  it("requests module nav items filtered by the signed-in user's roles", () => {
    const roles = [{ code: "SOME_ROLE" }];
    useAuthStore.setState({ user: { name: "A B", roles } });

    renderAppShell();

    expect(getModuleNavItems).toHaveBeenCalledWith(roles);
  });

  it("requests module nav items with undefined roles when there is no user", () => {
    renderAppShell();

    expect(getModuleNavItems).toHaveBeenCalledWith(undefined);
  });

  it("renders items returned by getModuleNavItems after the Overview item", () => {
    vi.mocked(getModuleNavItems).mockReturnValue([
      { id: "ir-installation-plans", label: "Installation Plans", to: "/livelihood-ui/ir/installation-plans" },
    ]);

    renderAppShell();

    const links = screen.getAllByRole("link", { name: /Overview|Installation Plans/ });
    expect(links.map((link) => link.textContent)).toEqual(["Overview", "Installation Plans"]);
    // The module item has no `icon`, unlike Overview (Home icon) — confirms
    // the `Icon ? <Icon /> : null` branch for the icon-less case.
    expect(links[1].querySelector("svg")).not.toBeInTheDocument();
    expect(links[0].querySelector("svg")).toBeInTheDocument();
  });

  it("resolves a labelKey through translateOr instead of using the raw label", () => {
    vi.mocked(useTranslate).mockReturnValue({ t: (key: string) => `translated:${key}` } as never);
    vi.mocked(getModuleNavItems).mockReturnValue([
      {
        id: "ir-installation-plans",
        label: "Installation Plans",
        labelKey: "ES_IR_INSTALLATION_PLANS",
        to: "/livelihood-ui/ir/installation-plans",
      },
      { id: "im-tickets", label: "Raw Label", to: "/livelihood-ui/im/tickets" },
    ]);

    renderAppShell();

    expect(screen.getByRole("link", { name: "translated:ES_IR_INSTALLATION_PLANS" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Raw Label" })).toBeInTheDocument();
  });
});

describe("active nav item highlighting", () => {
  it("marks the Overview item active only on an exact pathname match", () => {
    mockUseRouterState.mockReturnValue(HOME_PATH);
    renderAppShell();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-active", "true");
  });

  it("does not mark the Overview item active for a nested pathname", () => {
    mockUseRouterState.mockReturnValue(`${HOME_PATH}/profile`);
    renderAppShell();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("data-active", "false");
  });

  it("marks another nav item active on an exact `to` match", () => {
    const to = "/livelihood-ui/ir/installation-plans";
    vi.mocked(getModuleNavItems).mockReturnValue([{ id: "ir", label: "Installation Plans", to }]);
    mockUseRouterState.mockReturnValue(to);

    renderAppShell();

    expect(screen.getByRole("link", { name: "Installation Plans" })).toHaveAttribute("data-active", "true");
  });

  it("marks another nav item active for a pathname nested under its `to`", () => {
    const to = "/livelihood-ui/ir/installation-plans";
    vi.mocked(getModuleNavItems).mockReturnValue([{ id: "ir", label: "Installation Plans", to }]);
    mockUseRouterState.mockReturnValue(`${to}/plan-1/activities`);

    renderAppShell();

    expect(screen.getByRole("link", { name: "Installation Plans" })).toHaveAttribute("data-active", "true");
  });

  it("does not mark another nav item active for an unrelated pathname", () => {
    const to = "/livelihood-ui/ir/installation-plans";
    vi.mocked(getModuleNavItems).mockReturnValue([{ id: "ir", label: "Installation Plans", to }]);
    mockUseRouterState.mockReturnValue("/livelihood-ui/im/tickets");

    renderAppShell();

    expect(screen.getByRole("link", { name: "Installation Plans" })).toHaveAttribute("data-active", "false");
  });

  it("marks a nav item active via matchPrefixes even when the pathname doesn't match `to`", () => {
    vi.mocked(getModuleNavItems).mockReturnValue([
      { id: "ir", label: "Installation Plans", to: "/livelihood-ui/ir/installation-plans", matchPrefixes: ["/livelihood-ui/ir/archive"] },
    ]);
    mockUseRouterState.mockReturnValue("/livelihood-ui/ir/archive/plan-1");

    renderAppShell();

    expect(screen.getByRole("link", { name: "Installation Plans" })).toHaveAttribute("data-active", "true");
  });
});

describe("mobile navigation menu", () => {
  it("is closed by default", () => {
    renderAppShell();
    expect(screen.getAllByRole("link", { name: "Overview" })).toHaveLength(1);
  });

  it("opens the mobile nav sheet when the menu button is clicked", async () => {
    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // Radix marks the rest of the page inert (aria-hidden) while the sheet's
    // dialog is open, so the desktop sidebar's "Overview" link briefly drops
    // out of the accessibility tree — only the dialog's own copy is queryable.
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("link", { name: "Overview" })).toBeInTheDocument();
  });

  it("closes the mobile nav sheet when a nav link inside it is clicked", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Overview" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    consoleError.mockRestore();
  });
});

describe("logout confirmation", () => {
  it("opens the confirm dialog when Sign out is clicked, without logging out yet", async () => {
    const user = userEvent.setup();
    renderAppShell();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("cancelling the confirm dialog does not log out", async () => {
    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(logoutUser).not.toHaveBeenCalled();
  });

  it("confirming calls logoutUser with the access token and employee tenant id, then clears session and navigates", async () => {
    vi.mocked(logoutUser).mockResolvedValue(undefined);
    useAuthStore.setState({
      accessToken: "tok-123",
      employeeTenantId: "tenant-x",
      isAuthenticated: true,
      user: { name: "A B" },
    });
    useJurisdictionStore.setState({ boundaries: { state: [] } as never, hrmsUser: {} as never });

    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: employeeLoginPath() }));

    expect(logoutUser).toHaveBeenCalledWith("tok-123", "tenant-x");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useJurisdictionStore.getState().boundaries).toBeNull();
    expect(toast.success).toHaveBeenCalled();
  });

  it("falls back to tenantId() when employeeTenantId is not set", async () => {
    vi.mocked(logoutUser).mockResolvedValue(undefined);
    useAuthStore.setState({
      accessToken: "tok-123",
      employeeTenantId: null,
      isAuthenticated: true,
      user: { name: "A B" },
    });

    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(logoutUser).toHaveBeenCalled());
    expect(logoutUser).toHaveBeenCalledWith("tok-123", tenantId());
  });

  it("does not call logoutUser when there is no access token, but still clears session and navigates", async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: { name: "A B" } });

    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: employeeLoginPath() }));
    expect(logoutUser).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it("still clears session, toasts success, and navigates when logoutUser rejects", async () => {
    vi.mocked(logoutUser).mockRejectedValue(new Error("network down"));
    useAuthStore.setState({ accessToken: "tok-123", isAuthenticated: true, user: { name: "A B" } });

    const user = userEvent.setup();
    renderAppShell();

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: employeeLoginPath() }));
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(toast.success).toHaveBeenCalled();
  });
});
