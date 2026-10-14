import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
  WorkflowTimelineCheckpoint,
} from "../../types/incident-details";
import { ComplaintTimelineSection } from "./ComplaintTimelineSection";

vi.mock("./ComplaintActionBar", () => ({
  ComplaintActionBar: (props: {
    complaintDetails: ComplaintDetailsData;
    workflowDetails: WorkflowDetailsData;
    onActionComplete: () => Promise<void>;
  }) => (
    <div data-testid="action-bar">
      incidentId:{props.complaintDetails.incidentId} nextActions:
      {props.workflowDetails.nextActions.map((a) => a.action).join(",")}
    </div>
  ),
}));

function complaintDetails(
  additionalDetail: ComplaintDetailsData["incident"]["additionalDetail"] = {},
): ComplaintDetailsData {
  return {
    incidentId: "inc-1",
    tenantId: "tenant-1",
    rows: [],
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
      additionalDetail,
    },
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
  };
}

function workflowDetails(overrides: Partial<WorkflowDetailsData> = {}): WorkflowDetailsData {
  return { timeline: [], nextActions: [], processInstances: [], ...overrides };
}

describe("ComplaintTimelineSection", () => {
  it("renders nothing when the timeline is empty", () => {
    const { container } = render(
      <ComplaintTimelineSection
        timeline={[]}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Timeline heading and one entry per checkpoint, in order", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "RESOLVE" },
      { performedAction: "CREATE" },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Timeline")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("RESOLVE");
    expect(items[1]).toHaveTextContent("CREATE");
  });

  it("marks only the first (most recent) checkpoint's action text as latest", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "RESOLVE" },
      { performedAction: "CREATE" },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("RESOLVE")).toHaveClass("text-success-foreground");
    expect(screen.getByText("CREATE")).not.toHaveClass("text-success-foreground");
  });

  it("shows the checkpoint's last-modified date and assigner details", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      {
        performedAction: "RESOLVE",
        assigner: { name: "Jane Doe", mobileNumber: "9999999999" },
        auditDetails: { lastModified: "2024-01-01" },
      },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("9999999999")).toBeInTheDocument();
  });

  it("shows the out-of-scope reason for an OUT_OF_SCOPE checkpoint", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [{ performedAction: "OUT_OF_SCOPE" }];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails({ outOfScopeReason: ["NOT_INSTALLED"] })}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Out of scope reason")).toBeInTheDocument();
    expect(screen.getByText("NOT_INSTALLED")).toBeInTheDocument();
  });

  it("shows the decline reason for a DECLINE_POC checkpoint", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [{ performedAction: "DECLINE_POC" }];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails({ declineReason: ["NOT_APPLICABLE"] })}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Decline reason")).toBeInTheDocument();
    expect(screen.getByText("NOT_APPLICABLE")).toBeInTheDocument();
  });

  it("renders every workflow comment for a checkpoint", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "RESOLVE", wfComment: ["First comment", "Second comment"] },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("First comment")).toBeInTheDocument();
    expect(screen.getByText("Second comment")).toBeInTheDocument();
    expect(screen.getAllByText("Comments")).toHaveLength(2);
  });

  it("renders attachments for a non-create checkpoint that has thumbnails", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      {
        performedAction: "RESOLVE",
        thumbnailsToShow: { fullImage: ["https://example.com/a.jpg"], videos: [] },
      },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Attachments")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Attachment 1" })).toHaveAttribute(
      "href",
      "https://example.com/a.jpg",
    );
  });

  it("does not render attachments for a CREATE/APPLY checkpoint, even with thumbnails present", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [
      {
        performedAction: "CREATE",
        thumbnailsToShow: { fullImage: ["https://example.com/a.jpg"], videos: [] },
      },
    ];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
  });

  it("does not render an attachments block when there are no thumbnails", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [{ performedAction: "RESOLVE" }];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.queryByText("Attachments")).not.toBeInTheDocument();
  });

  it("renders the action bar with the given complaintDetails and workflowDetails", () => {
    const timeline: WorkflowTimelineCheckpoint[] = [{ performedAction: "RESOLVE" }];
    render(
      <ComplaintTimelineSection
        timeline={timeline}
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ nextActions: [{ action: "RESOLVE" }] })}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByTestId("action-bar")).toHaveTextContent("incidentId:inc-1");
    expect(screen.getByTestId("action-bar")).toHaveTextContent("nextActions:RESOLVE");
  });
});
