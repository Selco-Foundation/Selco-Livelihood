import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { irInstallationPlansPath } from "../utils/paths";
import { IrKpis } from "./IrOverview";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks/use-installation-plans", () => ({ useInstallationPlans: vi.fn() }));

import { useInstallationPlans } from "../hooks/use-installation-plans";

const irUser = { roles: [{ code: "INSTALLATION_REPORT_APPROVER_QC_TEAM" }] };

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("IrKpis", () => {
  it("renders nothing when the user lacks IR access", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    vi.mocked(useInstallationPlans).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<IrKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user has no roles at all", () => {
    useAuthStore.setState({ user: { roles: [] } });
    vi.mocked(useInstallationPlans).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<IrKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the total installation plans stat, linked to the installation plans page, when the user has IR access", () => {
    useAuthStore.setState({ user: irUser });
    vi.mocked(useInstallationPlans).mockReturnValue({
      data: { plans: [], totalCount: 42 },
      isLoading: false,
    } as never);

    render(<IrKpis />);

    expect(screen.getByText("Total Installation Plans")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", irInstallationPlansPath());
  });

  it("shows a dash placeholder while loading", () => {
    useAuthStore.setState({ user: irUser });
    vi.mocked(useInstallationPlans).mockReturnValue({ data: undefined, isLoading: true } as never);

    render(<IrKpis />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("defaults the count to 0 when data is present but totalCount is not", () => {
    useAuthStore.setState({ user: irUser });
    vi.mocked(useInstallationPlans).mockReturnValue({
      data: { plans: [] } as never,
      isLoading: false,
    } as never);

    render(<IrKpis />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
