import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { queryClient } from "./query-client";
import { QueryProvider } from "./provider";

function ClientProbe() {
  const client = useQueryClient();
  return <div>{client === queryClient ? "same-client" : "different-client"}</div>;
}

describe("QueryProvider", () => {
  it("provides the shared queryClient singleton to its children", () => {
    render(
      <QueryProvider>
        <ClientProbe />
      </QueryProvider>,
    );

    expect(screen.getByText("same-client")).toBeInTheDocument();
  });
});
