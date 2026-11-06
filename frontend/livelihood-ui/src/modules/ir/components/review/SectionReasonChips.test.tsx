import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RejectionReasonEntry } from "../../types/activity-review";
import { SectionReasonChips } from "./SectionReasonChips";

const reasons: RejectionReasonEntry[] = [
  { id: "r1", reasonCode: "DAMAGED", reasonLabel: "Damaged", comment: "Cracked panel" },
  { id: "r2", reasonCode: "MISSING", reasonLabel: "Missing part", comment: "" },
];

function renderChips(overrides: Partial<React.ComponentProps<typeof SectionReasonChips>> = {}) {
  const onEdit = vi.fn();
  const onRemove = vi.fn();
  const props: React.ComponentProps<typeof SectionReasonChips> = {
    reasons,
    onEdit,
    onRemove,
    ...overrides,
  };
  const result = render(<SectionReasonChips {...props} />);
  return { ...result, onEdit, onRemove };
}

describe("SectionReasonChips", () => {
  it("renders nothing when there are no reasons", () => {
    const { container } = renderChips({ reasons: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each reason's label, appending the comment when present", () => {
    renderChips();
    expect(screen.getByText("Damaged — Cracked panel")).toBeInTheDocument();
    expect(screen.getByText("Missing part")).toBeInTheDocument();
  });

  it("fires onEdit with the reason when its chip button is clicked", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderChips();
    await user.click(screen.getByText("Damaged — Cracked panel"));
    expect(onEdit).toHaveBeenCalledWith(reasons[0]);
  });

  it("fires onRemove with the reason id when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const { onRemove } = renderChips();
    const removeButtons = screen.getAllByRole("button", { name: "Remove reason" });
    await user.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("r1");
  });

  it("renders reasons as plain text with no edit/remove controls when readOnly", () => {
    renderChips({ readOnly: true });
    expect(screen.queryByRole("button", { name: "Remove reason" })).not.toBeInTheDocument();
    expect(screen.getByText("Damaged — Cracked panel")).toBeInTheDocument();
  });
});
