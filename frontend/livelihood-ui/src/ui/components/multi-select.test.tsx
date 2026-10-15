import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MultiSelect, type MultiSelectOption } from "./multi-select";

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

const options: MultiSelectOption[] = [
  { code: "DIST_B", name: "Beta" },
  { code: "DIST_A", name: "Alpha" },
  { code: "DIST_C", name: "Charlie" },
];

function renderMultiSelect(overrides: Partial<React.ComponentProps<typeof MultiSelect>> = {}) {
  const onChange = vi.fn();
  const props: React.ComponentProps<typeof MultiSelect> = {
    label: "District",
    options,
    selected: [],
    onChange,
    ...overrides,
  };
  const result = render(<MultiSelect {...props} />);
  return { ...result, onChange };
}

async function openPopover(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /District/ }));
  return within(screen.getByRole("dialog"));
}

describe("MultiSelect", () => {
  it("renders the label without a required asterisk by default", () => {
    renderMultiSelect();
    expect(screen.getByText("District")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders a required asterisk when required", () => {
    renderMultiSelect({ required: true });
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows the placeholder text when nothing is selected", () => {
    renderMultiSelect();
    expect(screen.getByText("Select")).toBeInTheDocument();
  });

  it("renders options sorted by name, ascending", async () => {
    const user = userEvent.setup();
    renderMultiSelect();

    const popover = await openPopover(user);

    const optionButtons = popover.getAllByRole("button").filter((button) =>
      options.some((option) => button.textContent?.includes(option.name)),
    );
    expect(optionButtons.map((button) => button.textContent)).toEqual([
      "Alpha",
      "Beta",
      "Charlie",
    ]);
  });

  it("filters options by the search query", async () => {
    const user = userEvent.setup();
    renderMultiSelect();

    const popover = await openPopover(user);
    await user.type(popover.getByPlaceholderText("Search"), "bet");

    expect(popover.getByText("Beta")).toBeInTheDocument();
    expect(popover.queryByText("Alpha")).not.toBeInTheDocument();
    expect(popover.queryByText("Charlie")).not.toBeInTheDocument();
  });

  it("shows the no-options message when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderMultiSelect();

    const popover = await openPopover(user);
    await user.type(popover.getByPlaceholderText("Search"), "zzz");

    expect(popover.getByText("No options found")).toBeInTheDocument();
  });

  it("adds a code to the selection when an unselected option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderMultiSelect({ selected: ["DIST_A"] });

    const popover = await openPopover(user);
    await user.click(popover.getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith(["DIST_A", "DIST_B"]);
  });

  it("removes a code from the selection when a selected option is clicked again", async () => {
    const user = userEvent.setup();
    const { onChange } = renderMultiSelect({ selected: ["DIST_A", "DIST_B"] });

    const popover = await openPopover(user);
    await user.click(popover.getByText("Alpha"));

    expect(onChange).toHaveBeenCalledWith(["DIST_B"]);
  });

  describe("select all", () => {
    it("renders a Select All control by default", async () => {
      const user = userEvent.setup();
      renderMultiSelect();
      const popover = await openPopover(user);
      expect(popover.getByText("Select All")).toBeInTheDocument();
    });

    it("hides the Select All control in single mode", async () => {
      const user = userEvent.setup();
      renderMultiSelect({ single: true });
      const popover = await openPopover(user);
      expect(popover.queryByText("Select All")).not.toBeInTheDocument();
    });

    it("selects every option when clicked while nothing is fully selected", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({ selected: [] });

      const popover = await openPopover(user);
      await user.click(popover.getByText("Select All"));

      expect(onChange).toHaveBeenCalledWith(["DIST_A", "DIST_B", "DIST_C"]);
    });

    it("clears the selection when clicked while every option is already selected", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({
        selected: ["DIST_A", "DIST_B", "DIST_C"],
      });

      const popover = await openPopover(user);
      await user.click(popover.getByText("Select All"));

      expect(onChange).toHaveBeenCalledWith([]);
    });

    // Membership, not a length comparison: an extra selected code that isn't
    // one of the current options (e.g. a stale/narrowed selection) must not
    // stop the real options from reading as fully selected.
    it("still treats every real option as selected when the selection also holds an unknown code", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({
        selected: ["DIST_A", "DIST_B", "DIST_C", "UNKNOWN_CODE"],
      });

      const popover = await openPopover(user);
      await user.click(popover.getByText("Select All"));

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe("single mode", () => {
    it("replaces the selection instead of adding to it", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({ single: true, selected: ["DIST_A"] });

      const popover = await openPopover(user);
      await user.click(popover.getByText("Beta"));

      expect(onChange).toHaveBeenCalledWith(["DIST_B"]);
    });

    it("clears the selection when the already-selected option is clicked again", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({ single: true, selected: ["DIST_A"] });

      const popover = await openPopover(user);
      await user.click(popover.getByText("Alpha"));

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe("chips", () => {
    it("renders a removable chip for each selected option", () => {
      renderMultiSelect({ selected: ["DIST_A", "DIST_B"] });
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });

    it("removes a chip's code from the selection when its remove button is clicked", async () => {
      const user = userEvent.setup();
      const { onChange } = renderMultiSelect({ selected: ["DIST_A", "DIST_B"] });

      await user.click(screen.getByRole("button", { name: "Remove Alpha" }));

      expect(onChange).toHaveBeenCalledWith(["DIST_B"]);
    });

    it("hides the chip row entirely when hideChips is set", () => {
      renderMultiSelect({ selected: ["DIST_A"], hideChips: true });
      expect(screen.queryByRole("button", { name: "Remove Alpha" })).not.toBeInTheDocument();
    });
  });

  it("disables the trigger when disabled", () => {
    renderMultiSelect({ disabled: true });
    expect(screen.getByRole("button", { name: /District/ })).toBeDisabled();
  });

  it("renders the error message when provided", () => {
    renderMultiSelect({ error: "Select at least one district" });
    expect(screen.getByText("Select at least one district")).toBeInTheDocument();
  });

  it("renders no error message when none is provided", () => {
    renderMultiSelect();
    expect(screen.queryByText("Select at least one district")).not.toBeInTheDocument();
  });
});
