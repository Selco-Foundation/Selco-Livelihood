import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FolderKanban } from "lucide-react";
import { StepSectionCard } from "./StepSectionCard";

describe("StepSectionCard", () => {
  it("renders the title, description, and children", () => {
    render(
      <StepSectionCard icon={FolderKanban} title="Project Details" description="Basic info">
        <p>Child content</p>
      </StepSectionCard>,
    );

    expect(screen.getByText("Project Details")).toBeInTheDocument();
    expect(screen.getByText("Basic info")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("omits the description paragraph when none is given", () => {
    render(
      <StepSectionCard icon={FolderKanban} title="Project Details">
        <p>Child content</p>
      </StepSectionCard>,
    );

    expect(screen.getByText("Project Details")).toBeInTheDocument();
    expect(screen.queryByText("Basic info")).not.toBeInTheDocument();
  });
});
