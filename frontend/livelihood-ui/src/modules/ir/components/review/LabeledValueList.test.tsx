import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LabeledValue } from "../../types/activity-review";
import { LabeledValueList, LabeledValueRows } from "./LabeledValueList";

const items: LabeledValue[] = [
  { labelKey: "ES_IR_SERIAL_NUMBER", label: "Serial Number", value: "SN-1" },
  { labelKey: "ES_IR_SPEC_CAPACITY", label: "Capacity", value: "5kW" },
];

describe("LabeledValueRows", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<LabeledValueRows items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each item's label and value", () => {
    render(<LabeledValueRows items={items} />);
    expect(screen.getByText("Serial Number")).toBeInTheDocument();
    expect(screen.getByText("SN-1")).toBeInTheDocument();
    expect(screen.getByText("Capacity")).toBeInTheDocument();
    expect(screen.getByText("5kW")).toBeInTheDocument();
  });

  it("translates the value when valueKey is set, falling back to the raw value", () => {
    render(
      <LabeledValueRows
        items={[{ labelKey: "ES_IR_DISTRICT", label: "District", value: "D1", valueKey: "BOUNDARY_D1" }]}
      />,
    );
    expect(screen.getByText("D1")).toBeInTheDocument();
  });
});

describe("LabeledValueList", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<LabeledValueList titleKey="ES_IR_DETAILS" title="Details" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and its rows when items is non-empty", () => {
    render(<LabeledValueList titleKey="ES_IR_DETAILS" title="Details" items={items} />);
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Serial Number")).toBeInTheDocument();
    expect(screen.getByText("SN-1")).toBeInTheDocument();
  });
});
