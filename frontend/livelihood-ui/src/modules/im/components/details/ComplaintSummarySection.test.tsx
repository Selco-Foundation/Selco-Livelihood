import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ComplaintDetailsData } from "../../types/incident-details";
import { ComplaintSummarySection } from "./ComplaintSummarySection";

function complaintDetails(rows: ComplaintDetailsData["rows"]): ComplaintDetailsData {
  return {
    incidentId: "inc-1",
    tenantId: "tenant-1",
    rows,
    incident: {
      tenantId: "tenant-1",
      incidentId: "inc-1",
      applicationStatus: "PENDING_FOR_RESOLUTION",
      incidentType: "SOLAR",
      incidentSubType: "PANEL",
    },
    workflow: {},
    images: [],
    videos: [],
    thumbnails: [],
  };
}

describe("ComplaintSummarySection", () => {
  it("renders the Ticket Details heading", () => {
    render(<ComplaintSummarySection complaintDetails={complaintDetails([])} />);

    expect(screen.getByText("Ticket Details")).toBeInTheDocument();
  });

  it("renders one label/value pair per row, in the given order", () => {
    const { container } = render(
      <ComplaintSummarySection
        complaintDetails={complaintDetails([
          { labelKey: "CS_COMPLAINT_DETAILS_TICKET_NO", value: "INC-1001" },
          { labelKey: "CS_ADDCOMPLAINT_BLOCK", value: "Block A" },
        ])}
      />,
    );

    const terms = Array.from(container.querySelectorAll("dt"));
    expect(terms.map((term) => term.textContent)).toEqual([
      "CS_COMPLAINT_DETAILS_TICKET_NO",
      "CS_ADDCOMPLAINT_BLOCK",
    ]);
    expect(screen.getByText("INC-1001")).toBeInTheDocument();
    expect(screen.getByText("Block A")).toBeInTheDocument();
  });

  it("renders a dash value as-is", () => {
    render(
      <ComplaintSummarySection
        complaintDetails={complaintDetails([{ labelKey: "CS_ADDCOMPLAINT_DISTRICT", value: "-" }])}
      />,
    );

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
