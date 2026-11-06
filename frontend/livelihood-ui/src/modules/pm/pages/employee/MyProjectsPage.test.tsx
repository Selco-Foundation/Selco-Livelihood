import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useBoundaryTree } from "../../hooks/use-boundary-tree";
import { useProjectsSearch } from "../../hooks/use-projects-search";
import { MyProjectsPage } from "./MyProjectsPage";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyProjectsPage />
    </QueryClientProvider>,
  );
}

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../../hooks/use-projects-search", () => ({ useProjectsSearch: vi.fn() }));
vi.mock("../../hooks/use-boundary-tree", () => ({ useBoundaryTree: vi.fn() }));

const pmUser = { roles: [{ code: "PROJECT_MANAGER" }] };

beforeEach(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  useAuthStore.setState({ user: pmUser });
  vi.mocked(useProjectsSearch).mockReturnValue({ data: { projects: [], totalCount: 0 }, isLoading: false } as never);
  vi.mocked(useBoundaryTree).mockReturnValue({ data: { states: [] } } as never);
});

describe("MyProjectsPage", () => {
  it("renders nothing for a non-Project-Manager", () => {
    useAuthStore.setState({ user: { roles: [{ code: "OTHER" }] } });

    const { container } = renderPage();

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the page title and a New Project action", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "My Projects" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /New Project/i }).length).toBeGreaterThan(0);
  });

  it("shows an empty-state message when there are no projects", () => {
    renderPage();

    expect(screen.getByText("No projects found")).toBeInTheDocument();
  });

  it("resets the page offset when the search text changes", async () => {
    const user = userEvent.setup();
    vi.mocked(useProjectsSearch).mockReturnValue({
      data: { projects: [], totalCount: 25 },
      isLoading: false,
    } as never);
    renderPage();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByLabelText("Search Project"), "Foo");

    await vi.waitFor(() =>
      expect(useProjectsSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({ name: "Foo", offset: 0 }),
      ),
    );
  });

  it("resets the page offset when filters change", async () => {
    const user = userEvent.setup();
    vi.mocked(useBoundaryTree).mockReturnValue({ data: { states: [{ code: "KA", name: "Karnataka" }] } } as never);
    vi.mocked(useProjectsSearch).mockReturnValue({
      data: { projects: [], totalCount: 25 },
      isLoading: false,
    } as never);
    renderPage();
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.click(screen.getByText("Filters"));
    await user.click(screen.getByText("Karnataka"));

    await vi.waitFor(() =>
      expect(useProjectsSearch).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0, filters: { stateCodes: ["KA"], statuses: [] } }),
      ),
    );
  });
});
