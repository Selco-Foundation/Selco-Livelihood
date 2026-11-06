import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrgRoleGroup } from "../../types/organisation";
import { RoleMultiSelect } from "./RoleMultiSelect";

const groups: OrgRoleGroup[] = [
  { code: "role-3", name: "Charlie Group", orgType: "PLATFORM", roleCodes: ["R3"] },
  { code: "role-1", name: "Alpha Group", orgType: "PLATFORM", roleCodes: ["R1"] },
  { code: "role-2", name: "Beta Group", orgType: "PLATFORM", roleCodes: ["R2"] },
];

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
});

describe("RoleMultiSelect", () => {
  it("renders groups sorted by name, ascending, regardless of the input order", async () => {
    const user = userEvent.setup();
    render(<RoleMultiSelect label="Roles" groups={groups} selected={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    const groupLabels = screen
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.closest("label")?.textContent);
    expect(groupLabels).toEqual(["Alpha Group", "Beta Group", "Charlie Group"]);
  });

  it("calls onChange with the toggled group added to the selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoleMultiSelect label="Roles" groups={groups} selected={[]} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByText("Beta Group"));

    expect(onChange).toHaveBeenCalledWith(["role-2"]);
  });

  it("shows the selected group's name as a removable chip", () => {
    render(<RoleMultiSelect label="Roles" groups={groups} selected={["role-1"]} onChange={vi.fn()} />);

    expect(screen.getByText("Alpha Group")).toBeInTheDocument();
  });
});
