import { describe, expect, it } from "vitest";
import { IrKpis as OriginalIrKpis } from "./components/IrOverview";
import { IR_ROUTES as OriginalIrRoutes } from "./constants/routes";
import { createIrModule as originalCreateIrModule, createIrRoutes as originalCreateIrRoutes } from "./routes";
import { createIrModule, createIrRoutes, IR_ROUTES, IrKpis } from "./index";

// This is a pure barrel/re-export file — the only invariant worth checking is
// that it re-exports the same values (by reference, for functions/components)
// as their original modules, rather than re-testing behavior covered by the
// tests for routes.tsx and IrOverview.tsx directly.
describe("ir module barrel exports", () => {
  it("re-exports IrKpis from components/IrOverview", () => {
    expect(IrKpis).toBeDefined();
    expect(IrKpis).toBe(OriginalIrKpis);
  });

  it("re-exports createIrModule and createIrRoutes from ./routes", () => {
    expect(createIrModule).toBeDefined();
    expect(createIrModule).toBe(originalCreateIrModule);
    expect(createIrRoutes).toBeDefined();
    expect(createIrRoutes).toBe(originalCreateIrRoutes);
  });

  it("re-exports IR_ROUTES from ./constants/routes", () => {
    expect(IR_ROUTES).toBeDefined();
    expect(IR_ROUTES).toBe(OriginalIrRoutes);
  });
});
