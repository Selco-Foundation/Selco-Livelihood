import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardActionFooter } from "./WizardActionFooter";

describe("WizardActionFooter", () => {
  it("renders its children inside a footer", () => {
    render(
      <WizardActionFooter>
        <button>Next</button>
      </WizardActionFooter>,
    );

    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
