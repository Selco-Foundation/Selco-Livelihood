import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useProjectsSearch } from "../hooks/use-projects-search";
import { PmKpis } from "./PmKpis";

vi.mock("../hooks/use-projects-search", () => ({ useProjectsSearch: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("PmKpis", () => {
  it("renders nothing for a non-Project-Manager", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });
    vi.mocked(useProjectsSearch).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<PmKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows '-' while loading", () => {
    useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });
    vi.mocked(useProjectsSearch).mockReturnValue({ data: undefined, isLoading: true } as never);

    render(<PmKpis />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows the total project count once loaded", () => {
    useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });
    vi.mocked(useProjectsSearch).mockReturnValue({ data: { totalCount: 7 }, isLoading: false } as never);

    render(<PmKpis />);

    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows 0 when the count is missing", () => {
    useAuthStore.setState({ user: { roles: [{ code: "PROJECT_MANAGER" }] } });
    vi.mocked(useProjectsSearch).mockReturnValue({ data: undefined, isLoading: false } as never);

    render(<PmKpis />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
