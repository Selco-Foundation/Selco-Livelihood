import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReportSectionContent } from "../../types/activity-review";
import { ReportSectionBody } from "./ReportSectionBody";

function makeSection(overrides: Partial<ReportSectionContent> = {}): ReportSectionContent {
  return {
    kind: "REPORT",
    id: "INSTALLATION_COMPLETION_REPORT",
    labelKey: "ES_IR_REPORT",
    label: "Installation Completion Report",
    report: null,
    supportingDocuments: [],
    ...overrides,
  };
}

describe("ReportSectionBody", () => {
  it("renders no specifications box when specifications is absent or empty", () => {
    render(<ReportSectionBody section={makeSection()} />);
    expect(screen.queryByText("Specifications")).not.toBeInTheDocument();
  });

  it("renders the specifications box when specifications has entries", () => {
    render(
      <ReportSectionBody
        section={makeSection({
          specifications: [{ labelKey: "ES_IR_VENDOR", label: "Vendor", value: "Acme Co" }],
        })}
      />,
    );
    expect(screen.getByText("Specifications")).toBeInTheDocument();
    expect(screen.getByText("Vendor")).toBeInTheDocument();
    expect(screen.getByText("Acme Co")).toBeInTheDocument();
  });

  it("renders no report document card when report is null", () => {
    render(<ReportSectionBody section={makeSection()} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the report document as a link with its name and formatted size", () => {
    render(
      <ReportSectionBody
        section={makeSection({
          report: { name: "Completion Report.pdf", url: "https://example.com/report.pdf", size: 2 * 1024 * 1024 },
        })}
      />,
    );
    const link = screen.getByRole("link", { name: /Completion Report.pdf/ });
    expect(link).toHaveAttribute("href", "https://example.com/report.pdf");
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("renders no supporting documents block when supportingDocuments is empty", () => {
    render(<ReportSectionBody section={makeSection()} />);
    expect(screen.queryByText("Supporting Documents")).not.toBeInTheDocument();
  });

  it("renders one document card per supporting document", () => {
    render(
      <ReportSectionBody
        section={makeSection({
          supportingDocuments: [
            { name: "Invoice.pdf", url: "https://example.com/invoice.pdf" },
            { name: "Warranty.pdf", url: "https://example.com/warranty.pdf" },
          ],
        })}
      />,
    );
    expect(screen.getByText("Supporting Documents")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Invoice.pdf/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Warranty.pdf/ })).toBeInTheDocument();
  });

  it("renders no file-size text for a document with no size", () => {
    render(
      <ReportSectionBody
        section={makeSection({
          report: { name: "Report.pdf", url: "https://example.com/report.pdf" },
        })}
      />,
    );
    expect(screen.getByText("Report.pdf")).toBeInTheDocument();
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument();
  });
});
