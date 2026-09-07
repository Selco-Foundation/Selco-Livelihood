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

function extractBoundaries(
  boundaries: BoundaryTreeNode[] | undefined,
  parentCode = "",
  compiledObject: Record<string, BoundaryNode[]> = {},
): Record<string, BoundaryNode[]> {
  if (!boundaries?.length) {
    return compiledObject;
  }

  for (const boundary of boundaries) {
    if (!boundary.code || !boundary.boundaryType) {
      continue;
    }

    const existingBoundaries = compiledObject[boundary.boundaryType] ?? [];

    if (!existingBoundaries.some((entry) => entry.code === boundary.code)) {
      compiledObject[boundary.boundaryType] = [
        ...existingBoundaries,
        { code: boundary.code, parentCode },
      ];
    }

    extractBoundaries(boundary.children, boundary.code, compiledObject);
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
        codes,
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

/**
 * Fetches the full hierarchy under one boundary level (e.g. every State, with
 * every District and Block nested beneath) — unlike `fetchBoundaryRelations`,
 * which resolves *known* codes' parents/children, this seeds the search from
 * a level instead of a code, for pickers that offer the whole tree.
 */
export async function fetchBoundaryTree(
  boundaryType: string,
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
        hierarchyType: "SELCO",
        boundaryType,
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
