/**
 * Unit tests for QueryProvider (src/shared/query/provider.tsx).
 *
 * QueryProvider is a thin wrapper around @tanstack/react-query's
 * QueryClientProvider: it takes `children` and renders them inside a
 * QueryClientProvider configured with the app's single shared `queryClient`
 * instance (imported from ./query-client). There is no branching logic or
 * local state in the component itself -- the only behavior worth verifying
 * is that (1) children are actually rendered, and (2) descendants receive
 * the real shared queryClient through context (not some ad-hoc client), so
 * that hooks like useQuery/useQueryClient work exactly as they would in the
 * running app.
 *
 * Testing approach: no mocking of React Query is used -- we render the real
 * QueryProvider with the real singleton `queryClient` and use plain child
 * components that call useQueryClient()/useQuery() from
 * "@tanstack/react-query" to observe what the provider actually wires up.
 * This is preferable to renderWithProviders' own QueryClientProvider setup,
 * because the whole point of these tests is to confirm QueryProvider passes
 * through the *shared* client, not a fresh one -- so we render QueryProvider
 * directly via @testing-library/react's `render`.
 */
import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { queryClient } from "./query-client";
import { QueryProvider } from "./provider";

// Child component used to inspect what QueryClient instance descendants
// receive from context -- if QueryProvider ever stopped passing the shared
// `queryClient` (e.g. accidentally constructed a new QueryClient inline),
// this would surface as an identity mismatch.
function ClientIdentityProbe() {
  const client = useQueryClient();
  return <div data-testid="is-shared-client">{String(client === queryClient)}</div>;
}

// Child component that exercises the provider end-to-end by running a real
// query through it, confirming the context wiring is functional and not
// just structurally present.
function QueryConsumer() {
  const { data, isSuccess } = useQuery({
    queryKey: ["provider-test-key"],
    queryFn: () => Promise.resolve("query-result"),
  });
  if (!isSuccess) {
    return <div>loading</div>;
  }
  return <div>{data}</div>;
}

describe("QueryProvider", () => {
  it("renders its children", () => {
    render(
      <QueryProvider>
        <div>App Content</div>
      </QueryProvider>,
    );

    expect(screen.getByText("App Content")).toBeInTheDocument();
  });

  it("renders multiple children passed as siblings", () => {
    render(
      <QueryProvider>
        <div>First</div>
        <div>Second</div>
      </QueryProvider>,
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("provides the shared queryClient singleton to descendants via context", () => {
    render(
      <QueryProvider>
        <ClientIdentityProbe />
      </QueryProvider>,
    );

    // Confirms useQueryClient() inside descendants resolves to the exact
    // `queryClient` instance exported from ./query-client, not a distinct
    // client -- this is the behavior that makes app-wide cache sharing work.
    expect(screen.getByTestId("is-shared-client")).toHaveTextContent("true");
  });

  it("allows descendants to run real queries through the shared client", async () => {
    render(
      <QueryProvider>
        <QueryConsumer />
      </QueryProvider>,
    );

    expect(screen.getByText("loading")).toBeInTheDocument();

    // findBy* is used (not getBy*) because the query resolves asynchronously
    // via a microtask -- the provider must actually forward React Query's
    // context for useQuery to fetch and re-render with data.
    await waitFor(() => expect(screen.getByText("query-result")).toBeInTheDocument());
  });

  it("uses a real QueryClient instance as the shared client", () => {
    // Guards against ./query-client ever exporting a plain object instead of
    // a QueryClient -- QueryClientProvider expects the real class instance.
    expect(queryClient).toBeInstanceOf(QueryClient);
  });
});
