import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/shared";
import { useAmcProjects } from "../../hooks/use-amc-projects";
import { AmcProjectsPage } from "./AmcProjectsPage";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("../../hooks/use-amc-projects", () => ({ useAmcProjects: vi.fn() }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AmcProjectsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ accessToken: "token-1", user: { uuid: "u1", roles: [{ code: "AMC_REVIEWER" }] } });
  vi.mocked(useAmcProjects).mockReturnValue({
    data: [
      {
        projectId: "amc-proj-1",
        projectName: "JUS-12345-26-26",
        states: ["Assam"],
        districts: ["Kamrup", "Barpeta"],
        blocks: ["Rangia"],
        pendingCount: 3,
        breachedCount: 1,
        autoApprovedCount: 2,
      },
    ],
    isLoading: false,
  } as never);
});

afterEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe("AmcProjectsPage", () => {
  it("lists each project with its geography and counts", () => {
    renderPage();

    expect(screen.getByText("JUS-12345-26-26")).toBeInTheDocument();
    expect(screen.getByText("Kamrup, Barpeta")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("opens the project's AMC reports when a row is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("JUS-12345-26-26"));

    expect(navigate).toHaveBeenCalledWith({ to: expect.stringContaining("/employee/amc/projects/amc-proj-1") });
  });
});
