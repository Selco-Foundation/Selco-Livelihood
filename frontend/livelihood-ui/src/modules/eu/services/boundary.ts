import { apiClient, tenantId as getTenantId, type AuthUser } from "@/shared";
import { createRequestInfo } from "@/shared/api/request-info";
import type { BoundaryRow } from "../types/boundary";

/**
 * The `getAllBoundaries` request-body criteria. Distinct from
 * `shared/api/boundary.ts`'s `fetchBoundaryRelations` (a tree fetch for
 * cascading selects) — this is the paginated table listing, one row per leaf
 * (Block-level) boundary.
 */
export interface BoundarySearchCriteria {
  tenantId: string;
  hierarchyType: "SELCO";
  boundaryType: "Block";
  parentCodes?: string[];
}

interface BoundarySearchResponseRow {
  country?: string;
  state?: string;
  district?: string;
  block?: string;
  code?: string;
}

interface BoundarySearchResponse {
  Boundary?: BoundarySearchResponseRow[];
  TotalCount?: number;
}

function toBoundaryRow(row: BoundarySearchResponseRow): BoundaryRow {
  return {
    countryCode: row.country ?? "",
    stateCode: row.state ?? "",
    districtCode: row.district ?? "",
    blockCode: row.block ?? "",
    code: row.code ?? row.block ?? "",
  };
}

export async function searchBoundaries(
  criteria: BoundarySearchCriteria,
  options: { limit?: number; offset?: number } = {},
  accessToken: string,
  user?: AuthUser | null,
): Promise<{ boundaries: BoundaryRow[]; total: number }> {
  const { data } = await apiClient.post<BoundarySearchResponse>(
    "/boundary-service/boundary/v2/getAllBoundaries",
    {
      RequestInfo: createRequestInfo(accessToken, user),
      criteria,
    },
    {
      params: {
        tenantId: criteria.tenantId || getTenantId(),
        offset: options.offset ?? 0,
        limit: options.limit ?? 10,
      },
    },
  );

  const boundaries = data.Boundary?.map(toBoundaryRow) ?? [];
  return { boundaries, total: data.TotalCount ?? boundaries.length };
}

export interface CreateBoundaryPayload {
  tenantId: string;
  code: string;
  /** LGD identity, denormalised: a State sets only lgdStateCode, a District state + district,
   *  a Block all three plus lgdBlockTier. Empty values are not sent. */
  lgdStateCode?: string;
  lgdDistrictCode?: string;
  lgdBlockCode?: string;
  lgdBlockTier?: string;
}

/** Drops empty LGD fields so a boundary created without codes stores NULL, not "". */
function lgdFields(payload: CreateBoundaryPayload): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const key of ["lgdStateCode", "lgdDistrictCode", "lgdBlockCode", "lgdBlockTier"] as const) {
    const value = payload[key]?.trim();
    if (value) fields[key] = value;
  }
  return fields;
}

/** Note: creating a state/district tier that already exists can return a
 * "boundary already exists" error — callers of this function decide whether
 * to swallow that error (`ignoreIfExists`), this just makes the request. */
export async function createBoundary(
  payload: CreateBoundaryPayload,
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const { data } = await apiClient.post("/boundary-service/boundary/_create", {
    RequestInfo: createRequestInfo(accessToken, user),
    Boundary: [{ tenantId: payload.tenantId, code: payload.code, geometry: null, ...lgdFields(payload) }],
  });

  return data;
}

export interface BoundaryLgdCodes {
  lgdStateCode?: string;
  lgdDistrictCode?: string;
  lgdBlockCode?: string;
  lgdBlockTier?: string;
}

/** The stored LGD codes of existing boundaries, by code (`/boundary/_search` returns them). */
export async function fetchBoundaryLgdCodes(
  codes: string[],
  accessToken: string,
  user?: AuthUser | null,
): Promise<Map<string, BoundaryLgdCodes>> {
  const wanted = codes.filter(Boolean);
  if (wanted.length === 0) return new Map();
  const { data } = await apiClient.post<{ Boundary?: Array<BoundaryLgdCodes & { code?: string }> }>(
    "/boundary-service/boundary/_search",
    { RequestInfo: createRequestInfo(accessToken, user) },
    { params: { tenantId: getTenantId(), codes: wanted.join(",") } },
  );
  return new Map((data.Boundary ?? []).filter((row) => row.code).map((row) => [row.code!, row]));
}

export interface CreateBoundaryRelationshipPayload {
  tenantId: string;
  code: string;
  boundaryType: "State" | "District" | "Block";
  parent: string;
}

export async function createBoundaryRelationship(
  payload: CreateBoundaryRelationshipPayload,
  accessToken: string,
  user?: AuthUser | null,
): Promise<unknown> {
  const { data } = await apiClient.post("/boundary-service/boundary-relationships/_create", {
    RequestInfo: createRequestInfo(accessToken, user),
    BoundaryRelationship: {
      tenantId: payload.tenantId,
      code: payload.code,
      hierarchyType: "SELCO",
      boundaryType: payload.boundaryType,
      parent: payload.parent,
    },
  });

  return data;
}
