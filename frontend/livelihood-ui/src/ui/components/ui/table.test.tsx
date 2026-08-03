/**
 * Unit tests for the Table primitives (src/ui/components/ui/table.tsx).
 *
 * This is a stock shadcn-style wrapper composed of eight small, stateless
 * presentational components, each rendering a single native HTML table
 * element with a fixed `data-slot` marker and a base Tailwind class string
 * produced via `cn(...)` (clsx + tailwind-merge), plus pass-through of
 * arbitrary props (className, data-testid, data-state, etc.):
 *
 *  - Table: wraps a `<table data-slot="table">` in an outer
 *    `<div data-slot="table-container" class="relative w-full overflow-x-auto">`
 *    for horizontal scrolling -- this is the one component in the file that
 *    is NOT a 1:1 element passthrough, so the wrapping structure itself is
 *    a behavior worth asserting (the div is always present, and the caller's
 *    className lands on the `<table>`, not the wrapping div).
 *  - TableHeader: `<thead>`.
 *  - TableBody: `<tbody>`.
 *  - TableFooter: `<tfoot>`.
 *  - TableRow: `<tr>`.
 *  - TableHead: `<th>`.
 *  - TableCell: `<td>`.
 *  - TableCaption: `<caption>`.
 *
 * None of these components hold internal state, read context, do routing,
 * or do i18n, so every test renders directly with RTL's `render`/`screen`
 * -- no provider wrapper (no router, no i18n, no query client) and no
 * mocking of any kind. Several base class strings include Tailwind
 * arbitrary-variant selectors (e.g. `[&_tr]:border-b`,
 * `data-[state=selected]:bg-muted`, `[&:has([role=checkbox])]:pr-0`) which
 * are CSS-time selectors evaluated by Tailwind/the browser against DOM
 * structure, not something the component branches on in JS -- these are
 * asserted as static classes (present unconditionally) rather than by
 * trying to observe their visual effect in jsdom.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

// Table renders a <table data-slot="table" role="table"> nested inside a
// wrapping <div data-slot="table-container" class="relative w-full
// overflow-x-auto"> that enables horizontal scrolling for wide tables. The
// caller's className merges onto the <table> itself, not the wrapping div.
describe("Table", () => {
  it("wraps a table element in a scrollable container div", () => {
    const { container } = render(
      <Table data-testid="tbl">
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </Table>,
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("data-slot", "table");
    expect(table).toHaveAttribute("data-testid", "tbl");
    expect(table).toHaveClass("w-full", "caption-bottom", "text-sm");

    // The outer div is a structural wrapper, not the element the caller's
    // props/testid land on -- verify it exists as the table's parent and
    // carries its own fixed slot/classes.
    const wrapper = container.querySelector('[data-slot="table-container"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("relative", "w-full", "overflow-x-auto");
    expect(wrapper).toContainElement(table);
  });

  it("merges a custom className onto the table element, not the wrapper div", () => {
    const { container } = render(
      <Table className="my-table" data-testid="tbl">
        <tbody>
          <tr>
            <td>cell</td>
          </tr>
        </tbody>
      </Table>,
    );

    const table = screen.getByTestId("tbl");
    expect(table).toHaveClass("my-table", "w-full");

    const wrapper = container.querySelector('[data-slot="table-container"]');
    expect(wrapper).not.toHaveClass("my-table");
  });
});

// TableHeader renders a <thead data-slot="table-header">; its
// `[&_tr]:border-b` class applies a bottom border to descendant rows via a
// CSS selector, not a JS branch.
describe("TableHeader", () => {
  it("renders a thead with the table-header data-slot", () => {
    render(
      <table>
        <TableHeader data-testid="thead">
          <tr>
            <th>Col</th>
          </tr>
        </TableHeader>
      </table>,
    );

    const thead = screen.getByTestId("thead");
    expect(thead.tagName).toBe("THEAD");
    expect(thead).toHaveAttribute("data-slot", "table-header");
    expect(screen.getByRole("rowgroup")).toBe(thead);
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <TableHeader className="my-header" data-testid="thead">
          <tr>
            <th>Col</th>
          </tr>
        </TableHeader>
      </table>,
    );

    expect(screen.getByTestId("thead")).toHaveClass("my-header");
  });
});

// TableBody renders a <tbody data-slot="table-body">; its
// `[&_tr:last-child]:border-0` class removes the border on the last row via
// a CSS selector, not a JS branch.
describe("TableBody", () => {
  it("renders a tbody with the table-body data-slot", () => {
    render(
      <table>
        <TableBody data-testid="tbody">
          <tr>
            <td>cell</td>
          </tr>
        </TableBody>
      </table>,
    );

    const tbody = screen.getByTestId("tbody");
    expect(tbody.tagName).toBe("TBODY");
    expect(tbody).toHaveAttribute("data-slot", "table-body");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <TableBody className="my-body" data-testid="tbody">
          <tr>
            <td>cell</td>
          </tr>
        </TableBody>
      </table>,
    );

    expect(screen.getByTestId("tbody")).toHaveClass("my-body");
  });
});

// TableFooter renders a <tfoot data-slot="table-footer"> with a top border
// and muted background, used for summary/total rows.
describe("TableFooter", () => {
  it("renders a tfoot with the table-footer data-slot and base classes", () => {
    render(
      <table>
        <TableFooter data-testid="tfoot">
          <tr>
            <td>Total</td>
          </tr>
        </TableFooter>
      </table>,
    );

    const tfoot = screen.getByTestId("tfoot");
    expect(tfoot.tagName).toBe("TFOOT");
    expect(tfoot).toHaveAttribute("data-slot", "table-footer");
    expect(tfoot).toHaveClass("border-t", "font-medium");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <TableFooter className="my-footer" data-testid="tfoot">
          <tr>
            <td>Total</td>
          </tr>
        </TableFooter>
      </table>,
    );

    expect(screen.getByTestId("tfoot")).toHaveClass("my-footer", "border-t");
  });
});

// TableRow renders a <tr data-slot="table-row"> with hover/selected-state
// background classes. `data-[state=selected]:bg-muted` is a CSS attribute
// selector Tailwind compiles against the `data-state` attribute -- the
// component itself does not branch on `data-state` in JS, it only forwards
// whatever props (including `data-state`) the caller passes through.
describe("TableRow", () => {
  it("renders a tr with the table-row data-slot and base classes", () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>,
    );

    const row = screen.getByTestId("row");
    expect(row.tagName).toBe("TR");
    expect(row).toHaveAttribute("data-slot", "table-row");
    expect(row).toHaveClass("border-b", "transition-colors");
    expect(screen.getByRole("row")).toBe(row);
  });

  // `data-state="selected"` is just forwarded through `{...props}` like any
  // other prop; verifying it lands on the DOM node confirms the selected
  // styling hook (a CSS-only selector) has something to select against.
  it("forwards a data-state attribute so the selected-row CSS selector has a hook", () => {
    render(
      <table>
        <tbody>
          <TableRow data-state="selected" data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("row")).toHaveAttribute("data-state", "selected");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <tbody>
          <TableRow className="my-row" data-testid="row">
            <td>cell</td>
          </TableRow>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("row")).toHaveClass("my-row", "border-b");
  });
});

// TableHead renders a <th data-slot="table-head"> column heading cell.
describe("TableHead", () => {
  it("renders a th with the table-head data-slot and base classes", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead>Name</TableHead>
          </tr>
        </thead>
      </table>,
    );

    const head = screen.getByRole("columnheader", { name: "Name" });
    expect(head.tagName).toBe("TH");
    expect(head).toHaveAttribute("data-slot", "table-head");
    expect(head).toHaveClass("h-10", "px-2", "text-left", "font-medium");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead className="my-head">Name</TableHead>
          </tr>
        </thead>
      </table>,
    );

    expect(screen.getByRole("columnheader")).toHaveClass("my-head", "h-10");
  });
});

// TableCell renders a <td data-slot="table-cell"> data cell.
describe("TableCell", () => {
  it("renders a td with the table-cell data-slot and base classes", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell>Value</TableCell>
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByRole("cell", { name: "Value" });
    expect(cell.tagName).toBe("TD");
    expect(cell).toHaveAttribute("data-slot", "table-cell");
    expect(cell).toHaveClass("p-2", "align-middle", "whitespace-nowrap");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell className="my-cell">Value</TableCell>
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByRole("cell")).toHaveClass("my-cell", "p-2");
  });
});

// TableCaption renders a <caption data-slot="table-caption"> with muted,
// small supporting text describing the table's contents.
describe("TableCaption", () => {
  it("renders a caption with the table-caption data-slot and base classes", () => {
    render(
      <table>
        <TableCaption>A list of recent invoices.</TableCaption>
      </table>,
    );

    const caption = screen.getByText("A list of recent invoices.");
    expect(caption.tagName).toBe("CAPTION");
    expect(caption).toHaveAttribute("data-slot", "table-caption");
    expect(caption).toHaveClass("mt-4", "text-sm", "text-muted-foreground");
  });

  it("merges a custom className with its base classes", () => {
    render(
      <table>
        <TableCaption className="my-caption">Caption text</TableCaption>
      </table>,
    );

    expect(screen.getByText("Caption text")).toHaveClass("my-caption", "mt-4");
  });
});

// Full composition: assembles Table/TableHeader/TableBody/TableFooter/
// TableRow/TableHead/TableCell/TableCaption together the way a real
// consumer would, confirming the pieces nest correctly and produce the
// expected accessible table structure (table > rowgroups > rows >
// column headers / cells) all at once.
describe("Table composition", () => {
  it("renders a full table with header, body, footer, and caption", () => {
    render(
      <Table>
        <TableCaption>Invoice summary</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Widget</TableCell>
            <TableCell>$10</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Gadget</TableCell>
            <TableCell>$20</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>$30</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Invoice summary")).toHaveAttribute("data-slot", "table-caption");

    expect(screen.getByRole("columnheader", { name: "Item" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();

    // Three data rows total (2 body + 1 footer), each exposed as an
    // accessible "row" alongside the header row.
    expect(screen.getAllByRole("row")).toHaveLength(4);

    expect(screen.getByRole("cell", { name: "Widget" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "$10" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Gadget" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "$20" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "$30" })).toBeInTheDocument();
  });
});
