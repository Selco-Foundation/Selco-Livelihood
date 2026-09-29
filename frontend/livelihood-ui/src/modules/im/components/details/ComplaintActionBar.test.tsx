import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import type {
  ComplaintDetailsData,
  WorkflowDetailsData,
  WorkflowTimelineCheckpoint,
} from "../../types/incident-details";
import { ComplaintActionBar } from "./ComplaintActionBar";

vi.mock("./ComplaintActionDialog", () => ({
  ComplaintActionDialog: (props: {
    action: string;
    excludeVendorUuid?: string;
    onClose: () => void;
    onComplete: () => Promise<void>;
  }) => (
    <div data-testid="action-dialog">
      <p>action:{props.action}</p>
      <p>excludeVendorUuid:{props.excludeVendorUuid ?? "none"}</p>
      <button type="button" onClick={props.onClose}>
        Mock close
      </button>
      <button type="button" onClick={() => props.onComplete()}>
        Mock complete
      </button>
    </div>
  ),
}));

function complaintDetails(applicationStatus = "PENDING_FOR_RESOLUTION"): ComplaintDetailsData {
  return {
    incidentId: "inc-1",
    tenantId: "tenant-1",
    rows: [],
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus,
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
    },
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
  };
}

function workflowDetails(overrides: Partial<WorkflowDetailsData> = {}): WorkflowDetailsData {
  return {
    timeline: [],
    nextActions: [],
    processInstances: [],
    ...overrides,
  };
}

afterEach(() => {
  useAuthStore.setState({ user: null });
});

describe("ComplaintActionBar", () => {
  it("renders nothing when the ticket is closed, even with available actions", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const { container } = render(
      <ComplaintActionBar
        complaintDetails={complaintDetails("CLOSED_AFTER_RESOLUTION")}
        workflowDetails={workflowDetails({ nextActions: [{ action: "RESOLVE" }] })}
        onActionComplete={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no next actions", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const { container } = render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails()}
        onActionComplete={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("filters out actions not in the supported workflow action set", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ nextActions: [{ action: "SOME_UNSUPPORTED_ACTION" }] })}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a single primary button when exactly one action is available, opening the dialog with it on click", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ nextActions: [{ action: "RESOLVE" }] })}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("action-dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "RESOLVE" }));

    expect(screen.getByTestId("action-dialog")).toBeInTheDocument();
    expect(screen.getByText("action:RESOLVE")).toBeInTheDocument();
  });

  it("renders a Take action menu when multiple actions are available, opening the dialog with the clicked action", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({
          nextActions: [{ action: "RESOLVE" }, { action: "DECLINE" }],
        })}
        onActionComplete={vi.fn()}
      />,
    );

    expect(screen.getByText("Take action", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Choose an action to update this ticket")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Take action" }));
    expect(screen.getByRole("button", { name: "DECLINE" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "DECLINE" }));

    expect(screen.getByText("action:DECLINE")).toBeInTheDocument();
    // Selecting an action from the menu also closes the menu.
    expect(screen.queryByRole("button", { name: "RESOLVE" })).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside it", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({
          nextActions: [{ action: "RESOLVE" }, { action: "DECLINE" }],
        })}
        onActionComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Take action" }));
    expect(screen.getByRole("button", { name: "DECLINE" })).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole("button", { name: "DECLINE" })).not.toBeInTheDocument();
  });

  it("excludes REOPEN for an end user who has already reopened the maximum number of times", () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINANT" }] } });
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "REOPEN" },
      { performedAction: "REOPEN" },
    ];
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({
          timeline,
          nextActions: [{ action: "REOPEN" }, { action: "RESOLVE" }],
        })}
        onActionComplete={vi.fn()}
      />,
    );

    // Only RESOLVE remains, so it renders as the single primary action.
    expect(screen.getByRole("button", { name: "RESOLVE" })).toBeInTheDocument();
    expect(screen.queryByText("Take action")).not.toBeInTheDocument();
  });

  it("keeps REOPEN available for a non-end-user even after the reopen count is reached", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "REOPEN" },
      { performedAction: "REOPEN" },
    ];
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({
          timeline,
          nextActions: [{ action: "REOPEN" }, { action: "RESOLVE" }],
        })}
        onActionComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Take action" }));
    expect(screen.getByRole("button", { name: "REOPEN" })).toBeInTheDocument();
  });

  it("passes the assigner uuid of the most recent OUT_OF_SCOPE checkpoint as excludeVendorUuid", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const timeline: WorkflowTimelineCheckpoint[] = [
      { performedAction: "OUT_OF_SCOPE", assigner: { uuid: "vendor-1" } },
    ];
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ timeline, nextActions: [{ action: "ASSIGN_VENDOR" }] })}
        onActionComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "ASSIGN_VENDOR" }));

    expect(screen.getByText("excludeVendorUuid:vendor-1")).toBeInTheDocument();
  });

  it("awaits onActionComplete and closes the dialog when the dialog reports completion", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const onActionComplete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ nextActions: [{ action: "RESOLVE" }] })}
        onActionComplete={onActionComplete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "RESOLVE" }));
    await user.click(screen.getByText("Mock complete"));

    expect(onActionComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("action-dialog")).not.toBeInTheDocument();
  });

  it("closes the dialog without calling onActionComplete when the dialog is closed", async () => {
    useAuthStore.setState({ user: { roles: [{ code: "COMPLAINT_RESOLVER" }] } });
    const onActionComplete = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ComplaintActionBar
        complaintDetails={complaintDetails()}
        workflowDetails={workflowDetails({ nextActions: [{ action: "RESOLVE" }] })}
        onActionComplete={onActionComplete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "RESOLVE" }));
    await user.click(screen.getByText("Mock close"));

    expect(onActionComplete).not.toHaveBeenCalled();
    expect(screen.queryByTestId("action-dialog")).not.toBeInTheDocument();
  });
});
