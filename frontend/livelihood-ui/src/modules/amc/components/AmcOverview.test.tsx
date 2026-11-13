import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { amcReportsPath } from "../utils/paths";
import { AmcKpis } from "./AmcOverview";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks/use-amc-report-count", () => ({ useAmcReportCount: vi.fn() }));

import { useAmcReportCount } from "../hooks/use-amc-report-count";

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("AmcKpis", () => {
  it("renders nothing without the AMC reviewer role", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    vi.mocked(useAmcReportCount).mockReturnValue({ data: 5, isLoading: false } as never);

    const { container } = render(<AmcKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the total report count, linked to the reports page", () => {
    useAuthStore.setState({ user: { roles: [{ code: "AMC_REVIEWER" }] } });
    vi.mocked(useAmcReportCount).mockReturnValue({ data: 15, isLoading: false } as never);

    render(<AmcKpis />);

    expect(screen.getByText("Total AMC Reports")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", amcReportsPath());
  });

  it("shows a dash while loading", () => {
    useAuthStore.setState({ user: { roles: [{ code: "AMC_REVIEWER" }] } });
    vi.mocked(useAmcReportCount).mockReturnValue({ data: undefined, isLoading: true } as never);

    render(<AmcKpis />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
