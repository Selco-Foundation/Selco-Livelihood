/**
 * Unit tests for the DropdownMenu family (src/ui/components/ui/dropdown-menu.tsx).
 *
 * This file is a thin shadcn-style wrapper around Radix's `DropdownMenu`
 * primitives (`radix-ui`'s `DropdownMenu` namespace): every exported
 * component (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`,
 * `DropdownMenuGroup`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`,
 * `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`,
 * `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`,
 * `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuPortal`)
 * just forwards props to the matching Radix primitive, adding a
 * `data-slot` attribute and (for the styled ones) a `cn(...)` class string,
 * plus a couple of real branches worth exercising at runtime:
 *   - `DropdownMenuItem`'s `variant` ("default" | "destructive") and
 *     `inset` props surface as `data-variant` / `data-inset` attributes.
 *   - `DropdownMenuCheckboxItem` / `DropdownMenuRadioItem` only mount their
 *     check/circle indicator icon when Radix considers the item checked
 *     (checkbox: `checked` prop; radio: item's `value` matches the group's
 *     `value`) -- Radix's `ItemIndicator` does not render its children
 *     otherwise.
 *   - The whole tree is interactive: clicking the trigger opens the
 *     (portalled) content, clicking an item fires its `onSelect`/`onClick`
 *     and closes the menu, and `DropdownMenuSubTrigger` opens a nested
 *     `DropdownMenuSubContent` on hover.
 *
 * Testing approach: this component is pure UI plumbing with no i18n, no
 * routing, and no network calls, so tests render trees directly with RTL's
 * `render`/`screen` -- no provider wrapper, no service-layer mocking, only
 * plain `vi.fn()` handlers to observe callbacks. Radix renders `Content`
 * through a `Portal` into `document.body`, so assertions on menu items use
 * async `findBy*`/`findAllBy*` queries (never synchronous `getBy*`) to give
 * the portal a chance to mount, and `userEvent` (not `fireEvent`) is used
 * throughout so Radix's pointer/keyboard interaction handlers fire the way
 * they do in a real browser.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// DropdownMenu (Root) + DropdownMenuTrigger + DropdownMenuContent + DropdownMenuItem
// together implement the standard "click trigger to open, click item to act and
// close" flow. The Root is uncontrolled by default (open state lives inside Radix),
// so the only preconditions are: a Trigger must exist to open it, and Content's
// children render only once Radix considers the menu open (it's portalled into
// document.body, hence the async findBy* queries below).
describe("DropdownMenu open/close via trigger and item selection", () => {
  it("does not render menu items until the trigger is clicked", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("opens the content and renders its items after clicking the trigger", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));

    expect(await screen.findByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    // The content wrapper itself should carry the shadcn data-slot marker.
    expect(screen.getByText("Profile").closest('[data-slot="dropdown-menu-content"]')).not.toBeNull();
  });

  it("fires the item's onSelect handler when clicked, and closes the menu", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    await user.click(await screen.findByText("Profile"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    // Radix closes the menu on item selection by default (no preventDefault
    // was called in onSelect above), so the item unmounts from the DOM.
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("groups items under DropdownMenuGroup without altering their content", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));

    const group = (await screen.findByText("Profile")).closest('[data-slot="dropdown-menu-group"]');
    expect(group).not.toBeNull();
    expect(within(group as HTMLElement).getByText("Billing")).toBeInTheDocument();
  });
});

// DropdownMenuItem accepts an `inset` boolean and a `variant` ("default" |
// "destructive", default "default"), both mirrored straight onto data-*
// attributes that the component's Tailwind selectors key off of
// (`data-[variant=destructive]:...`, `data-[inset]:pl-8`). These tests
// verify the prop -> attribute mapping for every branch.
describe("DropdownMenuItem inset and variant attributes", () => {
  async function openWithItem(itemProps: Record<string, unknown>) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem {...itemProps}>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await user.click(screen.getByText("Open menu"));
    return screen.findByText("Item");
  }

  it("defaults data-variant to 'default' and omits data-inset when neither prop is passed", async () => {
    const item = await openWithItem({});
    expect(item).toHaveAttribute("data-variant", "default");
    expect(item).not.toHaveAttribute("data-inset");
  });

  it("sets data-variant='destructive' when variant='destructive' is passed", async () => {
    const item = await openWithItem({ variant: "destructive" });
    expect(item).toHaveAttribute("data-variant", "destructive");
  });

  it("sets data-inset='true' when inset is passed", async () => {
    const item = await openWithItem({ inset: true });
    expect(item).toHaveAttribute("data-inset", "true");
  });
});

// DropdownMenuCheckboxItem wraps Radix's CheckboxItem, prefixing children with
// a CheckIcon inside an ItemIndicator. Radix's ItemIndicator only renders its
// children when the item is in the checked state, so the icon's presence in
// the DOM (not just a class) is the real signal to assert on -- and toggling
// `checked` is what the `onCheckedChange` callback is expected to report.
describe("DropdownMenuCheckboxItem checked state", () => {
  it("does not render the check icon when checked is false", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false}>Show grid</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    const item = await screen.findByText("Show grid");

    expect(item.closest('[data-slot="dropdown-menu-checkbox-item"]')?.querySelector("svg")).toBeNull();
  });

  it("renders the check icon when checked is true", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>Show grid</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    const item = await screen.findByText("Show grid");

    expect(item.closest('[data-slot="dropdown-menu-checkbox-item"]')?.querySelector("svg")).not.toBeNull();
  });

  it("invokes onCheckedChange with the toggled value when clicked", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Show grid
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    await user.click(await screen.findByText("Show grid"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

// DropdownMenuRadioGroup / DropdownMenuRadioItem wrap Radix's RadioGroup /
// RadioItem: only the item whose `value` matches the group's current
// `value` renders the CircleIcon indicator, and clicking any radio item
// reports that item's value via the group's `onValueChange`.
describe("DropdownMenuRadioGroup / DropdownMenuRadioItem selection", () => {
  it("renders the indicator only on the item matching the group's current value", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="asc">
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    const selected = await screen.findByText("Ascending");
    const unselected = screen.getByText("Descending");

    expect(selected.closest('[data-slot="dropdown-menu-radio-item"]')?.querySelector("svg")).not.toBeNull();
    expect(unselected.closest('[data-slot="dropdown-menu-radio-item"]')?.querySelector("svg")).toBeNull();
  });

  it("calls onValueChange with the clicked item's value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="asc" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    await user.click(await screen.findByText("Descending"));

    expect(onValueChange).toHaveBeenCalledWith("desc");
  });
});

// DropdownMenuLabel, DropdownMenuSeparator and DropdownMenuShortcut are
// purely presentational: they render their data-slot marker and (for Label)
// mirror `inset` to `data-inset`, with no interactive behavior of their own.
describe("DropdownMenuLabel / DropdownMenuSeparator / DropdownMenuShortcut static rendering", () => {
  it("renders the label text with its data-slot marker and data-inset when inset is passed", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));

    const label = await screen.findByText("My Account");
    expect(label).toHaveAttribute("data-slot", "dropdown-menu-label");
    expect(label).toHaveAttribute("data-inset", "true");

    expect(document.querySelector('[data-slot="dropdown-menu-separator"]')).not.toBeNull();

    const shortcut = screen.getByText("⇧⌘P");
    expect(shortcut).toHaveAttribute("data-slot", "dropdown-menu-shortcut");
    expect(shortcut.tagName).toBe("SPAN");
  });
});

// DropdownMenuSub composes Radix's Sub/SubTrigger/SubContent: hovering (or
// keyboard-focusing) the SubTrigger opens a nested SubContent without
// closing the parent menu, and the SubTrigger always renders a trailing
// ChevronRightIcon regardless of children.
describe("DropdownMenuSub nested submenu", () => {
  it("opens the sub-content and renders its items when the sub-trigger is hovered", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>More tools</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Extensions</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(screen.getByText("Open menu"));
    const subTrigger = await screen.findByText("More tools");

    // SubTrigger always appends a chevron icon after its children, regardless
    // of what those children are.
    expect(subTrigger.closest('[data-slot="dropdown-menu-sub-trigger"]')?.querySelector("svg")).not.toBeNull();

    await user.hover(subTrigger);

    expect(await screen.findByText("Extensions")).toBeInTheDocument();
  });
});
