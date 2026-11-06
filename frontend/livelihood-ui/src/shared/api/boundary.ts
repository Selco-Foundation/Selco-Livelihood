import { tenantId } from "../config/global-config";
import { createRequestInfo } from "./request-info";
import { apiClient } from "./client";
import type { AuthUser } from "../stores/auth-store";

export interface BoundaryNode {
  code: string;
  parentCode: string;
}

export interface BoundaryHierarchy {
  states?: BoundaryNode[];
  districts?: BoundaryNode[];
  blocks?: BoundaryNode[];
  facilities?: BoundaryNode[];
}

interface BoundaryTreeNode {
  code?: string;
  boundaryType?: string;
  children?: BoundaryTreeNode[];
}

interface BoundarySearchResponse {
  TenantBoundary?: Array<{
    boundary?: BoundaryTreeNode[];
  }>;
}

/**
 * Flattens the boundary tree into one list per boundaryType, keeping the first parentCode seen
 * for each code.
 *
 * Linear in the number of nodes: `seen` is a Set and each list is pushed to, never rebuilt. The
 * search is asked for parents as well as children, so the same subtree comes back under many
 * parents -- a national jurisdiction returns ~170k nodes for ~11k distinct boundaries. A
 * per-node `.some()` plus an array spread was quadratic in the distinct count and froze the main
 * thread for ~2.5s after the response had already arrived.
 */
function extractBoundaries(
  boundaries: BoundaryTreeNode[] | undefined,
  parentCode = "",
  compiledObject: Record<string, BoundaryNode[]> = {},
  seen: Set<string> = new Set(),
): Record<string, BoundaryNode[]> {
  if (!boundaries?.length) {
    return compiledObject;
  }

  for (const boundary of boundaries) {
    if (!boundary.code || !boundary.boundaryType) {
      continue;
    }

    // Keyed on type as well as code: the same code under two types is two boundaries.
    const key = `${boundary.boundaryType}\u0000${boundary.code}`;
    if (!seen.has(key)) {
      seen.add(key);
      (compiledObject[boundary.boundaryType] ??= []).push({ code: boundary.code, parentCode });
    }

    extractBoundaries(boundary.children, boundary.code, compiledObject, seen);
  }

  return compiledObject;
}

export async function fetchBoundaryRelations(
  codes: string[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<BoundaryHierarchy> {
  const response = await apiClient.post<BoundarySearchResponse>(
    "/boundary-service/boundary-relationships/v2/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      BoundaryRelationship: {
        tenantId: tenantId(),
        includeChildren: true,
        includeParents: true,
        hierarchyType: "SELCO",
        // Omitting `codes` entirely (rather than sending `codes: []`) fetches every
        // boundary under the tenant's hierarchy — used to seed cascading
        // state/district/block selects that don't start from a known code.
        ...(codes.length > 0 ? { codes } : {}),
      },
    },
  );

  const compiled = extractBoundaries(response.data.TenantBoundary?.[0]?.boundary);

  return {
    states: compiled.State,
    districts: compiled.District,
    blocks: compiled.Block,
    facilities: compiled.Facility,
  };
}
