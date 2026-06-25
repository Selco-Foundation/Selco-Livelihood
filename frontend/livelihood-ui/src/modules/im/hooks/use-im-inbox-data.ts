import {
  tenantId,
  useAuthStore,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { LIVELIHOOD_INCIDENT_BUSINESS_SERVICE } from "../constants/workflow";
import { searchInbox } from "../services/inbox";
import type { ImInboxSearchParams } from "../types/inbox";
import { hasImAccess } from "../utils/access";
import { flattenInboxFilters } from "../utils/inbox-filters";
import {
  combineInboxResponses,
  normalizeInboxResponse,
} from "../utils/inbox-transform";
import { buildDefaultInboxRoleFilters, buildSummaryRoleFilters } from "./inbox-defaults";

export function useImInboxSummary() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const currentBoundary = useJurisdictionStore((state) => state.currentBoundary);

  const filters = {
    limit: 10,
    offset: 0,
    services: [LIVELIHOOD_INCIDENT_BUSINESS_SERVICE],
    sortOrder: "DESC",
    ...buildSummaryRoleFilters(user),
  };

  const enabled = Boolean(accessToken && employeeTenantId && hasImAccess(user?.roles));
  const jurisdiction = currentBoundary ?? { country: ["-"] };

  return useQuery({
    queryKey: ["im-inbox-summary", employeeTenantId, filters, jurisdiction],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await searchInbox(
        employeeTenantId!,
        jurisdiction,
        filters,
        accessToken!,
        user,
      );
      const normalized = normalizeInboxResponse(data);
      return {
        totalCount: normalized.total,
        nearingSlaCount: normalized.nearingSlaCount,
        statusMap: normalized.statusArray,
      };
    },
  });
}

export function useImInboxData(searchParams: ImInboxSearchParams) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const employeeTenantId = useAuthStore((state) => state.employeeTenantId);
  const currentBoundary = useJurisdictionStore((state) => state.currentBoundary);
  const { t } = useTranslate();

  const roleFilters = buildDefaultInboxRoleFilters(user);
  const filters = flattenInboxFilters(searchParams, {
    limit: searchParams.limit ?? 10,
    offset: searchParams.offset ?? 0,
    services: [LIVELIHOOD_INCIDENT_BUSINESS_SERVICE],
    sortOrder: "DESC",
    ...roleFilters.pgrQuery,
    ...roleFilters.wfQuery,
  });

  const enabled = Boolean(accessToken && employeeTenantId && hasImAccess(user?.roles));
  const jurisdiction = currentBoundary ?? { country: ["-"] };

  return useQuery({
    queryKey: [
      "im-inbox",
      employeeTenantId,
      searchParams,
      filters,
      jurisdiction,
    ],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const data = await searchInbox(
        employeeTenantId!,
        jurisdiction,
        filters,
        accessToken!,
        user,
      );
      const normalized = normalizeInboxResponse(data);
      const combinedRes = combineInboxResponses(normalized.items, user, t);
      return {
        combinedRes,
        total: normalized.total,
        statusArray: normalized.statusArray,
      };
    },
  });
}

export function useImMdms() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const stateTenantId = tenantId();

  return useQuery({
    queryKey: ["im-mdms", stateTenantId],
    enabled: Boolean(accessToken),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { fetchSystemFunctionality } = await import("../services/mdms");
      return fetchSystemFunctionality(accessToken!, user);
    },
  });
}

export function useImComplaintTypes() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const stateTenantId = tenantId();
  const { t } = useTranslate();

  return useQuery({
    queryKey: ["im-complaint-types", stateTenantId],
    enabled: Boolean(accessToken),
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async () => {
      const { fetchComplaintTypes } = await import("../services/mdms");
      return fetchComplaintTypes(accessToken!, user, t);
    },
  });
}
