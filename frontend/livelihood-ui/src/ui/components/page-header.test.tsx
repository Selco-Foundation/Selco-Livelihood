/**
 * Unit tests for PageHeader (src/ui/components/page-header.tsx).
 *
 * PageHeader is a purely presentational wrapper with no hooks, no i18n
 * lookups, and no router links, so these tests render it directly with
 * `@testing-library/react`'s `render` -- no provider wrapper or router
 * harness is needed (contrast with StatTile, which needs a router because
 * it can render a `Link`).
 *
 * Coverage:
 *  - title is always rendered as an <h1>.
 *  - description is conditionally rendered (the `description ? <p>...</p> : null`
 *    ternary) -- present when passed, absent when omitted.
 *  - action is conditionally rendered (the `action ? <div>...</div> : null`
 *    ternary) -- an arbitrary ReactNode is rendered when passed, absent when
 *    omitted.
 *  - both optional props can be supplied together without interfering with
 *    each other.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

// PageHeader({ title, description?, action? }) renders a title heading plus
// two independent ternaries: a <p> for `description` when truthy, and a
// wrapper <div> for `action` when truthy. Each is exercised in isolation and
// then together to confirm the branches don't interact.
describe("PageHeader", () => {
  it("renders the title and omits description/action when neither is provided", () => {
    render(<PageHeader title="Dashboard" />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    // Only title/description text nodes could ever appear; confirm no
    // paragraph description text and no action content leaked in.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });

  it("renders the description paragraph when description is provided", () => {
    render(<PageHeader title="Dashboard" description="Overview of your activity" />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Overview of your activity")).toBeInTheDocument();
  });

  it("renders the action node when action is provided", () => {
    render(<PageHeader title="Dashboard" action={<button type="button">New item</button>} />);

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New item" })).toBeInTheDocument();
  });

  it("renders title, description, and action together without interference", () => {
    render(
      <PageHeader
        title="Dashboard"
        description="Overview of your activity"
        action={<button type="button">New item</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Overview of your activity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New item" })).toBeInTheDocument();
  });
});
