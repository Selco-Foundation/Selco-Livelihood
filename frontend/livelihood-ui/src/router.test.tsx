import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateRouter = vi.fn();

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...actual, createRouter: (...args: unknown[]) => mockCreateRouter(...args) };
});

import { createAppRouter } from "./router";
import { enabledModules, rootRoute } from "./modules";

beforeEach(() => {
  mockCreateRouter.mockImplementation((options: unknown) => ({ __mockRouter: true, options }));
});

describe("createAppRouter", () => {
  it("flattens every enabled module's routes onto the shared rootRoute's children", () => {
    createAppRouter();

    const expectedRoutes = enabledModules.flatMap((module) => module.routes);
    expect(rootRoute.children).toEqual(expectedRoutes);
  });

  it("calls createRouter with that routeTree and defaultPreload set to intent", () => {
    createAppRouter();

    expect(mockCreateRouter).toHaveBeenCalledWith(
      expect.objectContaining({ routeTree: rootRoute, defaultPreload: "intent" }),
    );
  });

  it("returns whatever createRouter produces, unwrapped", () => {
    const router = createAppRouter();

    expect(router).toEqual(expect.objectContaining({ __mockRouter: true }));
  });
});
