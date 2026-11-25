import type { AmcReworkReason } from "../types/amc-visit";

/** egov-workflow refuses a longer comment; every reason and its comment share this one text. */
export const MAX_WORKFLOW_COMMENT_LENGTH = 1024;

/** The workflow comment of a REJECT step: a JSON list of `{ reason, comment }`. */
export function toReworkComment(reasons: AmcReworkReason[]): string {
  return JSON.stringify(reasons);
}

/** Characters still free in the workflow comment; negative when the reasons no longer fit. */
export function reworkCharactersLeft(reasons: AmcReworkReason[]): number {
  return MAX_WORKFLOW_COMMENT_LENGTH - toReworkComment(reasons).length;
}
