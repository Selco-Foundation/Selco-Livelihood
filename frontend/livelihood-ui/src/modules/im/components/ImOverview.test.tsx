import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { ImDetails, ImKpis, ImOverviewActions } from "./ImOverview";

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

vi.mock("../hooks/use-im-inbox-summary", () => ({ useImInboxSummary: vi.fn() }));
vi.mock("../hooks/use-end-user-assets", () => ({ useEndUserAssets: vi.fn() }));

import { useImInboxSummary } from "../hooks/use-im-inbox-summary";
import { useEndUserAssets } from "../hooks/use-end-user-assets";

const endUser = { roles: [{ code: "COMPLAINANT" }] };
const nonEndUserWithAccess = { roles: [{ code: "COMPLAINT_RESOLVER" }] };
const noAccessUser = { roles: [{ code: "OTHER" }] };
const pocUser = { roles: [{ code: "LIVELIHOOD_POC" }] };

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("ImKpis", () => {
  it("renders nothing when the user lacks IM access", () => {
    useAuthStore.setState({ user: noAccessUser });
    vi.mocked(useImInboxSummary).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<ImKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user has no roles at all", () => {
    useAuthStore.setState({ user: { roles: [] } });
    vi.mocked(useImInboxSummary).mockReturnValue({ data: undefined, isLoading: false } as never);

    const { container } = render(<ImKpis />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders total and nearing-SLA stats linked to the inbox when the user has IM access", () => {
    useAuthStore.setState({ user: endUser });
    vi.mocked(useImInboxSummary).mockReturnValue({
      data: { totalCount: 12, nearingSlaCount: 3 },
      isLoading: false,
    } as never);

    render(<ImKpis />);

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Nearing SLA")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/livelihood-ui/employee/im/inbox");
    expect(links[1]).toHaveAttribute("href", "/livelihood-ui/employee/im/inbox?nearing=1");
  });

  it("shows a dash placeholder for both stats while loading", () => {
    useAuthStore.setState({ user: endUser });
    vi.mocked(useImInboxSummary).mockReturnValue({ data: undefined, isLoading: true } as never);

    render(<ImKpis />);

    expect(screen.getAllByText("-")).toHaveLength(2);
  });
});

describe("ImOverviewActions", () => {
  it("renders nothing when the user lacks IM access", () => {
    useAuthStore.setState({ user: noAccessUser });

    const { container } = render(<ImOverviewActions />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user has IM access but cannot create an incident", () => {
    useAuthStore.setState({ user: nonEndUserWithAccess });

    const { container } = render(<ImOverviewActions />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a raise-ticket link when the user can create an incident", () => {
    useAuthStore.setState({ user: pocUser });

    render(<ImOverviewActions />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/livelihood-ui/employee/im/incident/create",
    );
    expect(screen.getByText("Raise New Ticket")).toBeInTheDocument();
    expect(screen.getByText("Raise Ticket")).toBeInTheDocument();
  });
});

describe("ImDetails", () => {
  it("renders nothing when the user lacks IM access", () => {
    useAuthStore.setState({ user: noAccessUser });
    vi.mocked(useEndUserAssets).mockReturnValue({ assets: [], isLoading: false });

    const { container } = render(<ImDetails />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the user has IM access but is not an end user", () => {
    useAuthStore.setState({ user: nonEndUserWithAccess });
    vi.mocked(useEndUserAssets).mockReturnValue({ assets: [], isLoading: false });

    const { container } = render(<ImDetails />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the end-user assets list when the user is an end user with IM access", () => {
    useAuthStore.setState({ user: endUser });
    vi.mocked(useEndUserAssets).mockReturnValue({
      assets: [
        {
          assetId: "a1",
          tenantId: "tenant-1",
          facilityId: "fac-1",
          boundaryCode: "B1",
          assetTypeId: "PANEL",
          name: "Solar Panel",
        },
      ],
      isLoading: false,
    });

    render(<ImDetails />);

    expect(screen.getByText("My Registered Assets")).toBeInTheDocument();
    expect(screen.getByText("Solar Panel")).toBeInTheDocument();
  });

  it("shows the loading state from the hook", () => {
    useAuthStore.setState({ user: endUser });
    vi.mocked(useEndUserAssets).mockReturnValue({ assets: [], isLoading: true });

    render(<ImDetails />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
