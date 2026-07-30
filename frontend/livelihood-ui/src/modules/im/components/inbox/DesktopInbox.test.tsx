import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthStore, seedAuthenticatedSession } from "@/test/mocks/auth";
import { useJurisdictionStore } from "@/shared";
import * as boundaryApi from "@/shared/api/boundary";
import * as facilityApi from "@/shared/api/facility";
import * as mdmsService from "../../services/mdms";
import type { InboxDataResult } from "../../types/inbox";
import { DesktopInbox } from "./DesktopInbox";

function createTestI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: "en_IN",
    ns: ["translations"],
    defaultNS: "translations",
    resources: { en_IN: { translations: {} } },
    react: { useSuspense: false },
  });
  return instance;
}

function renderInbox(props: {
  data?: InboxDataResult;
  isLoading: boolean;
  totalRecords?: number;
}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <DesktopInbox
        data={props.data}
        isLoading={props.isLoading}
        onFilterChange={vi.fn()}
        searchParams={{}}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        currentPage={0}
        totalRecords={props.totalRecords ?? 0}
        pageSizeLimit={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  return render(
    <I18nextProvider i18n={createTestI18n()}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  seedAuthenticatedSession();
  useJurisdictionStore.setState({ boundaries: null, hrmsUser: null });
  vi.spyOn(boundaryApi, "fetchBoundaryRelations").mockResolvedValue({});
  vi.spyOn(facilityApi, "fetchFacilities").mockResolvedValue({ facilities: [], total: 0 });
  vi.spyOn(mdmsService, "fetchAssetTypes").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetAuthStore();
});

describe("DesktopInbox", () => {
  it("shows a loading skeleton while isLoading is true", async () => {
    const { container } = renderInbox({ isLoading: true });
    await screen.findByText("Filters", {}, { timeout: 3000 });
    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("shows the empty-state message when data resolves with zero rows", async () => {
    renderInbox({ isLoading: false, data: { combinedRes: [], total: 0, statusArray: [] } });
    expect(await screen.findByText("No Tickets Found")).toBeInTheDocument();
  });

  it("shows the results table when data has rows", async () => {
    renderInbox({
      isLoading: false,
      data: {
        combinedRes: [
          {
            incidentId: "INC-1",
            incidentType: "streetlight",
            assetLabel: "-",
            status: "PENDING_FOR_RESOLUTION",
            taskOwner: "-",
            sla: "-",
            endUser: "-",
            tenantId: "livelihood",
            potentialDuplicate: false,
          },
        ],
        total: 1,
        statusArray: [],
      },
    });
    expect((await screen.findAllByText("INC-1")).length).toBeGreaterThan(0);
  });

  it("shows the error-loading message when data is undefined and not loading", async () => {
    renderInbox({ isLoading: false, data: undefined });
    expect(await screen.findByText("Unable to load results")).toBeInTheDocument();
  });

  it("hides pagination when totalRecords is 0", async () => {
    renderInbox({ isLoading: false, totalRecords: 0 });
    await screen.findByText("Unable to load results", {}, { timeout: 3000 });
    expect(screen.queryByText("Items per Page")).not.toBeInTheDocument();
  });

  it("renders pagination when totalRecords is positive", async () => {
    renderInbox({
      isLoading: false,
      totalRecords: 25,
      data: { combinedRes: [], total: 0, statusArray: [] },
    });
    expect(await screen.findByText("Items per Page")).toBeInTheDocument();
  });
});
