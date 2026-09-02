import { tenantId } from "../config/global-config";
import { createRequestInfo } from "./request-info";
import { apiClient } from "./client";
import type { AuthUser } from "../stores/auth-store";

export interface HrmsJurisdiction {
  boundaryType?: string;
  boundary?: string;
}

export interface HrmsEmployeeUser {
  uuid?: string;
  name?: string;
}

export interface HrmsEmployee {
  code?: string;
  jurisdictions?: HrmsJurisdiction[];
  user?: HrmsEmployeeUser;
}

interface HrmsSearchResponse {
  Employees?: HrmsEmployee[];
}

/** `/egov-hrms/employees/_search`'s own query-param criteria — pass whichever of these the caller needs. */
export interface HrmsEmployeeSearchCriteria {
  codes?: string;
  roles?: string;
  isActive?: boolean;
  boundaryCodes?: string;
}

export async function searchHrmsEmployees(
  criteria: HrmsEmployeeSearchCriteria,
  accessToken: string,
  user?: AuthUser | null,
): Promise<HrmsEmployee[]> {
  const response = await apiClient.post<HrmsSearchResponse>(
    "/egov-hrms/employees/_search",
    {
      RequestInfo: createRequestInfo(accessToken, user),
    },
    {
      params: {
        tenantId: tenantId(),
        ...criteria,
      },
    },
  );

  return response.data.Employees ?? [];
}
