/**
 * Unit tests for the DataTable component (TanStack Table wrapper).
 *
 * Covers: DataTable<T> rendering of columns, rows, empty state with customizable message.
 * Testing approach: Renders the component with test data and mocked column definitions;
 * verifies header/cell content and empty message. No provider wrapper needed as DataTable is
 * a self-contained generic component with no external context dependencies.
 */
import { render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";
import { DataTable } from "./data-table";

interface Row {
  id: string;
  name: string;
}

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
];

/**
 * DataTable: A generic tabular component that renders TanStack Table columns and rows.
 * Inputs: columns (ColumnDef[]), data (TData[]), emptyMessage (optional, defaults to "No results.").
 * Shows the emptyMessage when data is empty; renders a header row and one body row per data item.
 */
describe("DataTable", () => {
  it("renders a header cell per column", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders one row per data item with the right cell values", () => {
    render(
      <DataTable
        columns={columns}
        data={[
          { id: "1", name: "Alice" },
          { id: "2", name: "Bob" },
        ]}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows the default empty message when data is empty", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("shows a custom empty message when provided", () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
});
