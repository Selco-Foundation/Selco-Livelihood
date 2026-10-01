import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewProjectButton } from "./NewProjectButton";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("NewProjectButton", () => {
  it("links to the create-project path", () => {
    render(<NewProjectButton />);

    expect(screen.getByRole("link", { name: /New Project/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/employee/pm/project/create"),
    );
  });
});
