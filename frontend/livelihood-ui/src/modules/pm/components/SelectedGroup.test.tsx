import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectedGroup } from "./SelectedGroup";

describe("SelectedGroup", () => {
  it("shows the empty label when there are no items", () => {
    render(<SelectedGroup title="States" emptyLabel="No states selected" items={[]} />);

    expect(screen.getByText("No states selected")).toBeInTheDocument();
  });

  it("renders each item's name as a chip", () => {
    render(
      <SelectedGroup
        title="States"
        emptyLabel="No states"
        items={[{ code: "KA", name: "Karnataka" }, { code: "AS", name: "Assam" }]}
      />,
    );

    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    expect(screen.getByText("Assam")).toBeInTheDocument();
  });

  it("calls onRemove with the item's code when its remove button is clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <SelectedGroup
        title="States"
        emptyLabel="No states"
        items={[{ code: "KA", name: "Karnataka" }]}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Karnataka/i }));

    expect(onRemove).toHaveBeenCalledWith("KA");
  });

  it("hides the remove button when disabled", () => {
    render(
      <SelectedGroup
        title="States"
        emptyLabel="No states"
        items={[{ code: "KA", name: "Karnataka" }]}
        onRemove={vi.fn()}
        disabled
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("hides the remove button when no onRemove is given", () => {
    render(<SelectedGroup title="States" emptyLabel="No states" items={[{ code: "KA", name: "Karnataka" }]} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
