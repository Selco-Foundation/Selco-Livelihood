import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchWorkflowBusinessService } from "./workflow";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
}));

describe("fetchWorkflowBusinessService", () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it("posts a businessservice search with tenantId and businessServices as params", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { BusinessServices: [] } });
    const user = { uuid: "u1", name: "Reviewer" };

    await fetchWorkflowBusinessService("tenant-1", "IR_FACILITY", "token-1", user);

    expect(apiClient.post).toHaveBeenCalledWith(
      "/egov-workflow-v2/egov-wf/businessservice/_search",
      {
        RequestInfo: expect.objectContaining({
          apiId: "Rainmaker",
          authToken: "token-1",
          userInfo: user,
        }),
      },
      { params: { tenantId: "tenant-1", businessServices: "IR_FACILITY" } },
    );
  });

  it("returns the raw response data unmodified", async () => {
    const responseData = { BusinessServices: [{ states: [{ state: "PENDING" }] }] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: responseData });

    const result = await fetchWorkflowBusinessService("tenant-1", "IR_FACILITY", "token-1");

    expect(result).toBe(responseData);
  });
});
