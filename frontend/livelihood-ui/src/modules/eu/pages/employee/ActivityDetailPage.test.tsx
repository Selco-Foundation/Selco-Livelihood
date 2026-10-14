import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityDetail } from "../../types/activity-detail";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  };
});

vi.mock("../../hooks/use-activity-details", () => ({
  useActivityDetails: vi.fn(),
  useLoadSectionMedia: vi.fn(),
}));

import { useAuthStore } from "@/shared";
import { useActivityDetails, useLoadSectionMedia } from "../../hooks/use-activity-details";
import { ActivityDetailPage } from "./ActivityDetailPage";

const EU_USER = { roles: [{ code: "END_USER_ADMIN" }] };

const sampleDetail: ActivityDetail = {
  info: { componentType: "SOLAR", status: "SUBMITTED_BY_FIELD_STAFF" },
  auditTrail: [],
  sections: [],
  sectionDocuments: {},
};

function setUser(user: typeof EU_USER | null) {
  useAuthStore.setState({ user });
}

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so
// every render needs a real QueryClient in context even though the only
// hook this page itself calls is mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityDetailPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(useLoadSectionMedia).mockReturnValue(vi.fn());
});

afterEach(() => {
  useAuthStore.setState({ user: null });
  vi.restoreAllMocks();
});

describe("ActivityDetailPage", () => {
  it("renders nothing when the signed-in user lacks eu access", () => {
    setUser({ roles: [{ code: "OTHER" }] });
    vi.mocked(useActivityDetails).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    const { container } = renderPage();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading skeleton while the query is pending", () => {
    setUser(EU_USER);
    vi.mocked(useActivityDetails).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as never);

    renderPage();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("shows the fetch-failed message when the query errors", () => {
    setUser(EU_USER);
    vi.mocked(useActivityDetails).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error("network error"),
    } as never);

    renderPage();
    expect(screen.getByText("Failed to load this activity's report")).toBeInTheDocument();
  });

  it("shows the not-found message when the query succeeds with no data", () => {
    setUser(EU_USER);
    vi.mocked(useActivityDetails).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    renderPage();
    expect(screen.getByText("Activity not found")).toBeInTheDocument();
  });

  it("renders the info card and audit trail, with no approve/reject or rejection-reason UI, when the query succeeds", () => {
    setUser(EU_USER);
    vi.mocked(useActivityDetails).mockReturnValue({
      data: sampleDetail,
      isLoading: false,
      isError: false,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByText("Solar")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add rejection reason/i })).not.toBeInTheDocument();
  });
});
