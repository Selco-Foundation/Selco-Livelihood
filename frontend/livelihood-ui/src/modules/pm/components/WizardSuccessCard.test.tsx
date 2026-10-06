import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardSuccessCard } from "./WizardSuccessCard";

describe("WizardSuccessCard", () => {
  it("renders the title, item label/name, and the given actions", () => {
    render(
      <WizardSuccessCard
        title="Project Created!"
        itemLabel="Project Name"
        itemName="My Project"
        actions={<button>Go to Projects</button>}
      />,
    );

    expect(screen.getByText("Project Created!")).toBeInTheDocument();
    expect(screen.getByText("Project Name")).toBeInTheDocument();
    expect(screen.getByText("My Project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Projects" })).toBeInTheDocument();
  });
});
