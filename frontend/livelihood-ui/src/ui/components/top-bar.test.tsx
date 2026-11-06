import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared")>();
  return {
    ...actual,
    // Avoids LanguageSwitcher firing a real network call through useQuery.
    useLanguages: () => [{ code: "en_IN", label: "English", nativeLabel: "English" }],
  };
});

import { useLocaleStore } from "@/shared";
import { TopBar } from "./top-bar";

function renderTopBar(props: React.ComponentProps<typeof TopBar>) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <TopBar {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useLocaleStore.setState({ locale: "en_IN" });
});

describe("TopBar", () => {
  it("renders the title", () => {
    renderTopBar({ title: "Installation Plans" });

    expect(screen.getByRole("heading", { name: "Installation Plans" })).toBeInTheDocument();
  });

  it("renders the description when given", () => {
    renderTopBar({ title: "Title", description: "Some description" });

    expect(screen.getByText("Some description")).toBeInTheDocument();
  });

  it("does not render a description paragraph when none is given", () => {
    renderTopBar({ title: "Title" });

    expect(screen.queryByText("Some description")).not.toBeInTheDocument();
  });

  it("renders breadcrumbs when given", () => {
    renderTopBar({ title: "Title", breadcrumbs: [{ label: "Home", to: "/home" }, { label: "Current" }] });

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/home");
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("renders the language switcher", () => {
    renderTopBar({ title: "Title" });

    expect(screen.getByRole("button", { name: /English/ })).toBeInTheDocument();
  });

  it("renders custom actions (once for desktop, once for the mobile row)", () => {
    renderTopBar({ title: "Title", actions: <button>Create Plan</button> });

    expect(screen.getAllByRole("button", { name: "Create Plan" })).toHaveLength(2);
  });

  it("renders no breadcrumb nav when there are neither breadcrumbs nor actions", () => {
    renderTopBar({ title: "Title" });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
