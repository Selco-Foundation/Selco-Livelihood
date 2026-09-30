import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
} from "../../types/incident-details";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
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

vi.mock("../../hooks/use-complaint-details", () => ({
  useComplaintDetails: vi.fn(),
}));

import { useComplaintDetails } from "../../hooks/use-complaint-details";
import { ComplaintDetailsPage } from "./ComplaintDetailsPage";

function makeComplaintDetails(
  overrides: Partial<ComplaintDetailsData> = {},
): ComplaintDetailsData {
  return {
    incidentId: "inc-1",
    tenantId: "tenant-1",
    rows: [{ labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: "PENDING_FOR_RESOLUTION" }],
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
    },
    workflow: {},
    images: ["https://cdn/complaint-image.png"],
    videos: [],
    thumbnails: [],
    ...overrides,
  };
}

function makeWorkflowDetails(
  overrides: Partial<WorkflowDetailsData> = {},
): WorkflowDetailsData {
  return {
    timeline: [{ performedAction: "CREATE", status: "PENDING_FOR_RESOLUTION" }],
    nextActions: [],
    processInstances: [],
    ...overrides,
  };
}

function mockUseComplaintDetails(
  overrides: Partial<ReturnType<typeof useComplaintDetails>> = {},
) {
  vi.mocked(useComplaintDetails).mockReturnValue({
    complaintDetails: makeComplaintDetails(),
    workflowDetails: makeWorkflowDetails(),
    isLoading: false,
    isError: false,
    error: undefined,
    revalidate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as never);
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseComplaintDetails();
});

// TopBar renders LanguageSwitcher, which calls useLanguages -> useQuery, so every
// render needs a real QueryClient in context even though useComplaintDetails itself
// is mocked above.
function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComplaintDetailsPage />
    </QueryClientProvider>,
  );
}

describe("ComplaintDetailsPage", () => {
  describe("when the URL doesn't carry an incidentId/tenantId", () => {
    beforeEach(() => {
      window.history.pushState({}, "", "/livelihood-ui/employee/im/inbox");
    });

    it("shows a generic error message with a link back to the inbox", () => {
      renderPage();
      expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
      const link = screen.getByRole("link", { name: "View inbox" });
      expect(link).toHaveAttribute("href", "/livelihood-ui/employee/im/inbox");
    });
  });

  describe("once the URL carries an incidentId/tenantId", () => {
    beforeEach(() => {
      window.history.pushState(
        {},
        "",
        "/livelihood-ui/employee/im/complaint/details/inc-1/tenant-1",
      );
    });

    it("shows a loading indicator while the details are loading", () => {
      mockUseComplaintDetails({
        complaintDetails: undefined,
        workflowDetails: undefined,
        isLoading: true,
      });
      const { container } = renderPage();
      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("shows a not-found message with a link back to the inbox when the query errors", () => {
      mockUseComplaintDetails({
        complaintDetails: undefined,
        workflowDetails: undefined,
        isError: true,
      });
      renderPage();
      expect(screen.getByText("Ticket not found")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "View inbox" })).toHaveAttribute(
        "href",
        "/livelihood-ui/employee/im/inbox",
      );
    });

    it("shows a not-found message when the query succeeds but returns no details", () => {
      mockUseComplaintDetails({ complaintDetails: undefined, workflowDetails: undefined });
      renderPage();
      expect(screen.getByText("Ticket not found")).toBeInTheDocument();
    });

    it("renders the breadcrumbs, ticket summary rows, and timeline once loaded", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "Ticket Details", level: 1 }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
        "href",
        "/livelihood-ui/employee",
      );
      expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute(
        "href",
        "/livelihood-ui/employee/im/inbox",
      );
      expect(screen.getByText("inc-1")).toBeInTheDocument();

      expect(screen.getByText("CS_COMPLAINT_DETAILS_TICKET_NO")).toBeInTheDocument();
      expect(screen.getByText("Timeline")).toBeInTheDocument();
    });

    it("shows the applyCheckpoint's media over the complaint's own images/videos when a CREATE/AUTO_ASSIGN checkpoint carries thumbnails", () => {
      mockUseComplaintDetails({
        complaintDetails: makeComplaintDetails({ images: ["https://cdn/fallback.png"] }),
        workflowDetails: makeWorkflowDetails({
          timeline: [
            {
              performedAction: "CREATE",
              status: "PENDING_FOR_RESOLUTION",
              thumbnailsToShow: { fullImage: ["https://cdn/checkpoint.png"], videos: [] },
            },
          ],
        }),
      });
      renderPage();

      const image = screen.getByAltText("Attachment 1") as HTMLImageElement;
      expect(image.src).toBe("https://cdn/checkpoint.png");
      expect(screen.queryByAltText("https://cdn/fallback.png")).not.toBeInTheDocument();
    });

    it("falls back to the complaint's own images/videos when no CREATE/AUTO_ASSIGN checkpoint is present", () => {
      mockUseComplaintDetails({
        complaintDetails: makeComplaintDetails({ images: ["https://cdn/fallback.png"] }),
        workflowDetails: makeWorkflowDetails({
          timeline: [{ performedAction: "ASSIGN", status: "PENDING_FOR_RESOLUTION" }],
        }),
      });
      renderPage();

      const image = screen.getByAltText("Attachment 1") as HTMLImageElement;
      expect(image.src).toBe("https://cdn/fallback.png");
    });

    it("renders nothing for the timeline section when the workflow has no checkpoints", () => {
      mockUseComplaintDetails({
        workflowDetails: makeWorkflowDetails({ timeline: [] }),
      });
      renderPage();
      expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
    });
  });
});
