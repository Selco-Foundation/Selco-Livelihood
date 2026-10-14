import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";

interface Row {
  id: string;
  name: string;
}

const columns: ColumnDef<Row, string>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
];

describe("DataTable", () => {
  it("renders a header cell per column", () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("renders one row per data item with its cell values", () => {
    render(
      <DataTable
        columns={columns}
        data={[
          { id: "1", name: "Alpha" },
          { id: "2", name: "Beta" },
        ]}
      />,
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header row + 2 data rows
  });

  it("renders the default empty message when there is no data", () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("renders a custom empty message when provided", () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here yet" />);

    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("spans the empty message across all columns", () => {
    render(<DataTable columns={columns} data={[]} />);

    expect(screen.getByRole("cell", { name: "No results." })).toHaveAttribute("colspan", "2");
  });
});
