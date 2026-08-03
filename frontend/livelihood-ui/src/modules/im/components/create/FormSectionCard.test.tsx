/**
 * Unit tests for FormSectionCard (src/modules/im/components/create/FormSectionCard.tsx).
 *
 * FormSectionCard is a purely presentational wrapper: it renders an icon next
 * to a title (+ optional description) header row, an optional divider, and
 * then whatever `children` are passed. It has no hooks, no i18n lookups, no
 * router usage, and no async behavior, so these tests render it directly with
 * `@testing-library/react`'s `render` -- no provider wrapper or router
 * harness is needed (same reasoning as the sibling PageHeader test).
 *
 * Coverage:
 *  - the `icon` component, `title`, and `children` are always rendered.
 *  - `description` is conditionally rendered (`description ? <p>...</p> : null`).
 *  - the header row's alignment class switches between "items-center" (no
 *    description) and "items-start" (description present) -- this governs
 *    whether the icon centers against a single title line or aligns to the
 *    top when a second description line is present.
 *  - the header row also switches between "mb-6 flex ..." (no divider, adds
 *    bottom margin before children) and "flex ..." (divider present, no
 *    margin) depending on the `divider` prop.
 *  - the `<hr>` divider itself is only rendered when `divider` is true.
 *  - `titleClassName` overrides the default title class when provided, and
 *    falls back to the default "text-lg font-semibold text-foreground" class
 *    when omitted.
 *
 * These branches are only visible via class names / DOM structure rather
 * than accessible text, so several assertions inspect `className` directly
 * on the queried elements -- this is intentional here since the component's
 * only observable behavior for these props is which CSS classes get applied.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormSectionCard } from "./FormSectionCard";

// A minimal stand-in for a lucide-react icon component: FormSectionCard
// destructures its `icon` prop as `Icon` and renders it as `<Icon className="size-5" />`,
// so any component accepting a className prop satisfies the LucideIcon type for testing.
function FakeIcon({ className }: { className?: string }) {
  return <svg data-testid="fake-icon" className={className} />;
}

// FormSectionCard({ icon, title, description?, titleClassName?, divider?, children })
// renders a <section> containing a header row (icon + title + optional
// description) followed by an optional <hr> divider and then `children`.
describe("FormSectionCard", () => {
  it("renders the icon, title, and children", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details">
        <div>Form content</div>
      </FormSectionCard>,
    );

    expect(screen.getByTestId("fake-icon")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Ticket details" })).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
  });

  it("omits the description paragraph when description is not provided", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details">
        <div>Form content</div>
      </FormSectionCard>,
    );

    // No <p> element should exist anywhere since the description ternary
    // renders null when `description` is omitted.
    expect(document.querySelector("p")).not.toBeInTheDocument();
  });

  it("renders the description paragraph when provided", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details" description="Fill in the basics">
        <div>Form content</div>
      </FormSectionCard>,
    );

    expect(screen.getByText("Fill in the basics")).toBeInTheDocument();
  });

  // Business rule: the header row uses "items-center" to vertically center the
  // icon against a single-line title when there's no description, but
  // switches to "items-start" so the icon aligns with the top of a two-line
  // title+description block once a description is present.
  it("uses items-center alignment when no description is provided", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details">
        <div>Form content</div>
      </FormSectionCard>,
    );

    const headerRow = screen.getByRole("heading", { level: 2 }).closest("div")?.parentElement;
    expect(headerRow).toHaveClass("items-center");
    expect(headerRow).not.toHaveClass("items-start");
  });

  it("uses items-start alignment when a description is provided", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details" description="Fill in the basics">
        <div>Form content</div>
      </FormSectionCard>,
    );

    const headerRow = screen.getByRole("heading", { level: 2 }).closest("div")?.parentElement;
    expect(headerRow).toHaveClass("items-start");
    expect(headerRow).not.toHaveClass("items-center");
  });

  // Business rule: without a divider, the header row carries "mb-6" to space
  // itself from `children` below; with a divider present, that margin is
  // dropped from the header row (the <hr>'s own "my-4" margin takes over).
  it("adds bottom margin to the header row when divider is not set", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details">
        <div>Form content</div>
      </FormSectionCard>,
    );

    const headerRow = screen.getByRole("heading", { level: 2 }).closest("div")?.parentElement;
    expect(headerRow).toHaveClass("mb-6");
    expect(document.querySelector("hr")).not.toBeInTheDocument();
  });

  it("omits bottom margin from the header row and renders an hr when divider is true", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details" divider>
        <div>Form content</div>
      </FormSectionCard>,
    );

    const headerRow = screen.getByRole("heading", { level: 2 }).closest("div")?.parentElement;
    expect(headerRow).not.toHaveClass("mb-6");
    expect(document.querySelector("hr")).toBeInTheDocument();
  });

  it("applies the default title class when titleClassName is not provided", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details">
        <div>Form content</div>
      </FormSectionCard>,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveClass(
      "text-lg",
      "font-semibold",
      "text-foreground",
    );
  });

  it("applies a custom titleClassName when provided, overriding the default", () => {
    render(
      <FormSectionCard icon={FakeIcon} title="Ticket details" titleClassName="text-xl text-red-500">
        <div>Form content</div>
      </FormSectionCard>,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveClass("text-xl", "text-red-500");
    expect(heading).not.toHaveClass("font-semibold");
  });
});
