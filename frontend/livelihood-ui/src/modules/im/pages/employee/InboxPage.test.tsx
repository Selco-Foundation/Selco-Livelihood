import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InboxRouteSearch } from "../../routes";
import type { InboxRow } from "../../types/inbox";

const mockNavigate = vi.fn();
let mockSearchState: InboxRouteSearch = {
  pageOffset: 0,
  pageSize: 10,
  filter: undefined,
  nearing: undefined,
};

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearchState,
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
}));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return { ...actual, useBoundary: vi.fn(), useFacility: vi.fn() };
});

vi.mock("../../hooks/use-im-inbox-summary", () => ({
  useImInboxData: vi.fn(),
  useImAssetTypes: vi.fn(),
}));

import { useAuthStore, useBoundary, useFacility } from "@/shared";
import { useImAssetTypes, useImInboxData } from "../../hooks/use-im-inbox-summary";
import { InboxPage } from "./InboxPage";

const POC_USER = { uuid: "user-1", roles: [{ code: "LIVELIHOOD_POC" }] };
const RESOLVER_USER = { uuid: "user-2", roles: [{ code: "COMPLAINT_RESOLVER" }] };

function makeRow(overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    incidentId: "inc-1",
    incidentType: "SOLAR",
    assetLabel: "PANEL",
    status: "PENDING_FOR_RESOLUTION",
    taskOwner: "Agent Smith",
    sla: "3",
    slaUrgent: false,
    endUser: "John Doe",
    tenantId: "tenant-1",
    potentialDuplicate: false,
    ...overrides,
  };
}

beforeEach(() => {
  mockSearchState = { pageOffset: 0, pageSize: 10, filter: undefined, nearing: undefined };
  mockNavigate.mockReset();
  mockNavigate.mockReturnValue(Promise.resolve());

  useAuthStore.setState({ user: POC_USER, accessToken: "token-1", employeeTenantId: "tenant-1" });
  vi.mocked(useBoundary).mockReturnValue({
    data: { blocks: [], facilities: [], districts: [], states: [] },
    isLoading: false,
  } as never);
  vi.mocked(useFacility).mockReturnValue({ data: { facilities: [] }, isLoading: false } as never);
  vi.mocked(useImAssetTypes).mockReturnValue({ data: [] } as never);
  vi.mocked(useImInboxData).mockReturnValue({
    data: { combinedRes: [makeRow()], total: 1, statusArray: [] },
    isLoading: false,
  } as never);
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, employeeTenantId: null, user: null });
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so every
// render needs a real QueryClient in context even though useImInboxData itself
// is mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InboxPage />
    </QueryClientProvider>,
  );
}

describe("InboxPage", () => {
  it("renders the fetched tickets", () => {
    renderPage();
    expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
    expect(screen.getAllByText("inc-1").length).toBeGreaterThan(0);
  });

  it("shows a loading skeleton while the inbox is loading", () => {
    vi.mocked(useImInboxData).mockReturnValue({ data: undefined, isLoading: true } as never);
    renderPage();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("shows the Raise New Ticket action for a user permitted to create incidents", () => {
    renderPage();
    const links = screen.getAllByRole("link", { name: /Raise New Ticket/ });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/incident/create");
    }
  });

  it("hides the Raise New Ticket action for a user not permitted to create incidents", () => {
    useAuthStore.setState({ user: RESOLVER_USER });
    renderPage();
    expect(screen.queryByRole("link", { name: /Raise New Ticket/ })).not.toBeInTheDocument();
  });

  it("requests the next page through navigate when Next is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useImInboxData).mockReturnValue({
      data: { combinedRes: [makeRow()], total: 25, statusArray: [] },
      isLoading: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("Next"));

    const lastCall = mockNavigate.mock.calls.at(-1)![0];
    const result = lastCall.search({ pageOffset: 0, pageSize: 10 });
    expect(result).toMatchObject({ pageOffset: 10 });
    expect(lastCall.replace).toBe(true);
  });

  it("requests the previous page through navigate when Previous is clicked", async () => {
    const user = userEvent.setup();
    mockSearchState = { pageOffset: 10, pageSize: 10, filter: undefined, nearing: undefined };
    vi.mocked(useImInboxData).mockReturnValue({
      data: { combinedRes: [makeRow()], total: 25, statusArray: [] },
      isLoading: false,
    } as never);
    renderPage();

    await user.click(screen.getByText("Previous"));

    const lastCall = mockNavigate.mock.calls.at(-1)![0];
    const result = lastCall.search({ pageOffset: 10, pageSize: 10 });
    expect(result).toMatchObject({ pageOffset: 0 });
  });

  it("resets to the first page when the page size changes", async () => {
    const user = userEvent.setup();
    mockSearchState = { pageOffset: 10, pageSize: 10, filter: undefined, nearing: undefined };
    vi.mocked(useImInboxData).mockReturnValue({
      data: { combinedRes: [makeRow()], total: 25, statusArray: [] },
      isLoading: false,
    } as never);
    renderPage();

    await user.selectOptions(screen.getByLabelText("Items per Page"), "20");

    const lastCall = mockNavigate.mock.calls.at(-1)![0];
    const result = lastCall.search({ pageOffset: 10, pageSize: 10 });
    expect(result).toMatchObject({ pageSize: 20, pageOffset: 0 });
  });

  it("switching to 'My Tickets' scopes the filter to the current user and resets pagination", async () => {
    const user = userEvent.setup();
    mockSearchState = { pageOffset: 10, pageSize: 10, filter: undefined, nearing: undefined };
    renderPage();

    await user.click(screen.getByLabelText("My Tickets"));

    await waitFor(() => {
      const lastCall = mockNavigate.mock.calls.at(-1)![0];
      const result = lastCall.search({ pageOffset: 10, pageSize: 10 });
      expect(result.pageOffset).toBe(0);
      expect(result.filter.wfFilters.assignee).toEqual([{ code: "user-1" }]);
    });
  });
});
