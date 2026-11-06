import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { EuKpis } from "./EuOverview";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, loadModules: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("../hooks/use-facility-summary", () => ({ useFacilitySummary: vi.fn() }));

import { useFacilitySummary } from "../hooks/use-facility-summary";

const adminUser = { roles: [{ code: "END_USER_ADMIN" }] };
const noAccessUser = { roles: [{ code: "OTHER" }] };

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("EuKpis", () => {
  it("renders nothing when the user lacks eu access", () => {
    useAuthStore.setState({ user: noAccessUser });
    vi.mocked(useFacilitySummary).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<EuKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user has no roles at all", () => {
    useAuthStore.setState({ user: { roles: [] } });
    vi.mocked(useFacilitySummary).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<EuKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the total facility count linked to the facilities list when the user has eu access", () => {
    useAuthStore.setState({ user: adminUser });
    vi.mocked(useFacilitySummary).mockReturnValue({ data: 42, isLoading: false } as never);

    render(<EuKpis />);

    expect(screen.getByText("Total End User Sites")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/livelihood-ui/employee/eu/facilities");
  });

  it("shows a dash placeholder while loading", () => {
    useAuthStore.setState({ user: adminUser });
    vi.mocked(useFacilitySummary).mockReturnValue({ data: undefined, isLoading: true } as never);

    render(<EuKpis />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
