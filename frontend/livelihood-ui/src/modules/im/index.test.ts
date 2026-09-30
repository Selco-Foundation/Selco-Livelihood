import { describe, expect, it } from "vitest";
import {
  ImDetails as OriginalImDetails,
  ImKpis as OriginalImKpis,
  ImOverviewActions as OriginalImOverviewActions,
} from "./components/ImOverview";
import { IM_ROUTES as OriginalImRoutes } from "./constants/routes";
import { createImModule as originalCreateImModule, createImRoutes as originalCreateImRoutes } from "./routes";
import {
  createImModule,
  createImRoutes,
  IM_ROUTES,
  ImDetails,
  ImKpis,
  ImOverviewActions,
} from "./index";

describe("im module barrel exports", () => {
  it("re-exports ImDetails, ImKpis, and ImOverviewActions from components/ImOverview", () => {
    expect(ImDetails).toBeDefined();
    expect(ImDetails).toBe(OriginalImDetails);
    expect(ImKpis).toBeDefined();
    expect(ImKpis).toBe(OriginalImKpis);
    expect(ImOverviewActions).toBeDefined();
    expect(ImOverviewActions).toBe(OriginalImOverviewActions);
  });

  it("re-exports createImModule and createImRoutes from ./routes", () => {
    expect(createImModule).toBeDefined();
    expect(createImModule).toBe(originalCreateImModule);
    expect(createImRoutes).toBeDefined();
    expect(createImRoutes).toBe(originalCreateImRoutes);
  });

  it("re-exports IM_ROUTES from ./constants/routes", () => {
    expect(IM_ROUTES).toBeDefined();
    expect(IM_ROUTES).toBe(OriginalImRoutes);
  });
});
