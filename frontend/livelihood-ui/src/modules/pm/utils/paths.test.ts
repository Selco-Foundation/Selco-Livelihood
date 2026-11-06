import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  pmCreateInstallationPlanPath,
  pmCreateProjectPath,
  pmMyProjectsPath,
  pmProjectDetailsPath,
} from "./paths";

describe("pm path builders", () => {
  beforeEach(() => {
    window.globalConfigs = { getConfig: () => "livelihood-ui" };
  });

  afterEach(() => {
    window.globalConfigs = { getConfig: () => undefined };
  });

  it("builds the my-projects path under the context path", () => {
    expect(pmMyProjectsPath()).toBe("/livelihood-ui/employee/pm/projects");
  });

  it("builds the create-project path under the context path", () => {
    expect(pmCreateProjectPath()).toBe("/livelihood-ui/employee/pm/project/create");
  });

  it("builds the project-details path under the context path", () => {
    expect(pmProjectDetailsPath()).toBe("/livelihood-ui/employee/pm/project/details");
  });

  it("builds the create-installation-plan path under the context path", () => {
    expect(pmCreateInstallationPlanPath()).toBe(
      "/livelihood-ui/employee/pm/project/installation-plan/create",
    );
  });

  it("reflects a different configured context path", () => {
    window.globalConfigs = { getConfig: () => "custom-path" };
    expect(pmMyProjectsPath()).toBe("/custom-path/employee/pm/projects");
  });
});
