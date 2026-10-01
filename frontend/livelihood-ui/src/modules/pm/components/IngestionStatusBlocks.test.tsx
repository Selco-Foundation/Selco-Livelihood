import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IngestionStatusBlocks } from "./IngestionStatusBlocks";

describe("IngestionStatusBlocks", () => {
  it("renders nothing when status isn't 'error'", () => {
    const { container } = render(<IngestionStatusBlocks status="idle" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders as an alert with the given error message when not guidance", () => {
    render(<IngestionStatusBlocks status="error" errorMessage="Upload failed" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Upload failed");
  });

  it("renders as a status (not alert) with an amber tone when isGuidance is true", () => {
    render(<IngestionStatusBlocks status="error" errorMessage="No sites available" isGuidance />);

    expect(screen.getByRole("status")).toHaveTextContent("No sites available");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls back to a generic message when errorMessage is missing", () => {
    render(<IngestionStatusBlocks status="error" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });
});
