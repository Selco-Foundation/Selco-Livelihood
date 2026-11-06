import { describe, expect, it } from "vitest";
import type { WorkflowBusinessServiceResponse } from "@/shared";
import type { WorkflowProcessInstance } from "../types/incident-details";
import { buildWorkflowDetailsData } from "./workflow-mapping";
import { formatEpochToDate } from "./date-format";

function baseInstance(overrides: Partial<WorkflowProcessInstance> = {}): WorkflowProcessInstance {
  return {
    action: "ASSIGN",
    tenantId: "tenant-1",
    ...overrides,
  };
}

describe("buildWorkflowDetailsData", () => {
  it("maps each process instance into a timeline checkpoint", () => {
    const instance = baseInstance({
      action: "ASSIGN",
      state: { state: "ASSIGNED", applicationStatus: "PENDING_FOR_RESOLUTION" },
      rating: 4,
      assigner: { name: "Assigner One" },
      assignes: [{ name: "Assignee One" }],
      auditDetails: { createdTime: new Date(2026, 0, 1).getTime(), lastModifiedTime: new Date(2026, 0, 2).getTime() },
      thumbnailsToShow: { thumbs: ["t1"], images: ["i1"], videos: [{ master: "m1", original: "o1" }] },
    });

    const businessServiceResponse: WorkflowBusinessServiceResponse = { BusinessServices: [{ states: [] }] };
    const result = buildWorkflowDetailsData(instance, businessServiceResponse, [instance], "LivelihoodIncident");

    expect(result.timeline).toEqual([
      {
        performedAction: "ASSIGN",
        status: "PENDING_FOR_RESOLUTION",
        state: "ASSIGNED",
        assigner: { name: "Assigner One" },
        rating: 4,
        wfComment: [],
        thumbnailsToShow: { thumbs: ["t1"], fullImage: ["i1"], videos: [{ master: "m1", original: "o1" }] },
        assignes: [{ name: "Assignee One" }],
        auditDetails: {
          created: formatEpochToDate(new Date(2026, 0, 1).getTime()),
          lastModified: formatEpochToDate(new Date(2026, 0, 2).getTime()),
          lastModifiedEpoch: new Date(2026, 0, 2).getTime(),
        },
      },
    ]);
    expect(result.applicationBusinessService).toBe("LivelihoodIncident");
    expect(result.processInstances).toEqual([instance]);
  });

  it("attaches preceding standalone COMMENT-action instances as wfComments on the next real instance", () => {
    const instances: WorkflowProcessInstance[] = [
      { action: "COMMENT", comment: "First comment" },
      { action: "COMMENT", comment: "Second comment" },
      { action: "ASSIGN", comment: "Assign-time note" },
    ];

    const result = buildWorkflowDetailsData(
      instances[2],
      { BusinessServices: [{ states: [] }] },
      instances,
      "LivelihoodIncident",
    );

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].wfComment).toEqual(["First comment", "Second comment", "Assign-time note"]);
  });

  it("drops trailing COMMENT-action instances that are never followed by a real instance", () => {
    const instances: WorkflowProcessInstance[] = [
      { action: "ASSIGN" },
      { action: "COMMENT", comment: "Dangling comment" },
    ];

    const result = buildWorkflowDetailsData(
      instances[0],
      { BusinessServices: [{ states: [] }] },
      instances,
      "LivelihoodIncident",
    );

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0].performedAction).toBe("ASSIGN");
  });

  it("filters out wfComments entries with no comment text", () => {
    const instances: WorkflowProcessInstance[] = [{ action: "ASSIGN" }];
    const result = buildWorkflowDetailsData(
      instances[0],
      { BusinessServices: [{ states: [] }] },
      instances,
      "LivelihoodIncident",
    );
    expect(result.timeline[0].wfComment).toEqual([]);
  });

  it("builds nextActions from the current instance's nextActions, dropping empty-action entries", () => {
    const instance = baseInstance({
      nextActions: [{ action: "APPROVE", roles: "ROLE_A" }, { action: "", roles: "ROLE_B" }],
    });

    const result = buildWorkflowDetailsData(
      instance,
      { BusinessServices: [{ states: [] }] },
      [instance],
      "LivelihoodIncident",
    );

    expect(result.nextActions).toEqual([{ action: "APPROVE", roles: "ROLE_A" }]);
  });

  it("returns actionState undefined when the current state's uuid has no match in businessService states", () => {
    const instance = baseInstance({ state: { uuid: "uuid-missing" } });
    const result = buildWorkflowDetailsData(
      instance,
      { BusinessServices: [{ states: [{ uuid: "other-uuid" }] }] },
      [instance],
      "LivelihoodIncident",
    );
    expect(result.actionState).toBeUndefined();
  });

  it("builds actionState with assigneeRoles resolved from the resultant state's own actions", () => {
    const instance = baseInstance({ state: { uuid: "state-1" } });
    const businessServiceResponse: WorkflowBusinessServiceResponse = {
      BusinessServices: [
        {
          states: [
            {
              uuid: "state-1",
              actions: [{ action: "APPROVE", roles: ["ROLE_A"], nextState: "state-2" }],
            },
            {
              uuid: "state-2",
              actions: [{ action: "CLOSE", roles: ["ROLE_B", "ROLE_C"] }],
            },
          ],
        },
      ],
    };

    const result = buildWorkflowDetailsData(instance, businessServiceResponse, [instance], "LivelihoodIncident");

    expect(result.actionState).toEqual({
      nextActions: [{ action: "APPROVE", roles: ["ROLE_A"], assigneeRoles: ["ROLE_B", "ROLE_C"] }],
    });
  });

  it("resolves assigneeRoles to an empty array when the resultant state has no actions", () => {
    const instance = baseInstance({ state: { uuid: "state-1" } });
    const businessServiceResponse: WorkflowBusinessServiceResponse = {
      BusinessServices: [
        {
          states: [
            { uuid: "state-1", actions: [{ action: "APPROVE", roles: ["ROLE_A"], nextState: "state-2" }] },
            { uuid: "state-2" },
          ],
        },
      ],
    };

    const result = buildWorkflowDetailsData(instance, businessServiceResponse, [instance], "LivelihoodIncident");
    expect(result.actionState?.nextActions?.[0].assigneeRoles).toEqual([]);
  });

  it("defaults states to an empty array when BusinessServices is missing", () => {
    const instance = baseInstance();
    const result = buildWorkflowDetailsData(instance, {}, [instance], "LivelihoodIncident");
    expect(result.actionState).toBeUndefined();
  });
});
