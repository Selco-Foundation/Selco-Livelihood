import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Factory } from "lucide-react";
import { FormSectionCard } from "./FormSectionCard";

describe("FormSectionCard", () => {
  it("renders the title, description, icon, and children", () => {
    render(
      <FormSectionCard icon={Factory} title="Asset Details" description="Pick an asset">
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(screen.getByRole("heading", { name: "Asset Details" })).toBeInTheDocument();
    expect(screen.getByText("Pick an asset")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("omits the description paragraph when none is given", () => {
    render(
      <FormSectionCard icon={Factory} title="Asset Details">
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(screen.getByRole("heading", { name: "Asset Details" })).toBeInTheDocument();
    expect(screen.queryByText("Pick an asset")).not.toBeInTheDocument();
  });

  it("applies the custom titleClassName when given", () => {
    render(
      <FormSectionCard icon={Factory} title="Asset Details" titleClassName="custom-title-class">
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(screen.getByRole("heading", { name: "Asset Details" })).toHaveClass(
      "custom-title-class",
    );
  });

  it("falls back to the default title styling when no titleClassName is given", () => {
    render(
      <FormSectionCard icon={Factory} title="Asset Details">
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(screen.getByRole("heading", { name: "Asset Details" })).toHaveClass(
      "text-lg",
      "font-semibold",
      "text-foreground",
    );
  });

  it("renders a divider and skips the bottom margin on the header when divider is true", () => {
    const { container } = render(
      <FormSectionCard icon={Factory} title="Asset Details" divider>
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(container.querySelector("hr")).toBeInTheDocument();
  });

  it("renders no divider by default", () => {
    const { container } = render(
      <FormSectionCard icon={Factory} title="Asset Details">
        <p>child content</p>
      </FormSectionCard>,
    );

    expect(container.querySelector("hr")).not.toBeInTheDocument();
  });
});
