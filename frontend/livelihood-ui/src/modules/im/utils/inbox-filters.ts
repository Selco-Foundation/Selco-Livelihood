const DAY = 24 * 60 * 60 * 1000;

export interface IncidentFilterInput {
  applicationNumber?: string;
  mobileNumber?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
  total?: number;
  applicationStatus?: string;
  services?: string[];
  incidentType?: string;
  incidentSubType?: string;
  facility?: string;
  assignee?: string;
  nearingSLA?: boolean;
  state?: string;
  district?: string;
  block?: string;
  isSystemFunctional?: string;
  wfStatus?: string;
  IncidentWrappers?: boolean;
  incidentId?: string;
  tenantId?: string;
}

export interface IncidentFilterResult {
  searchFilters: Record<string, unknown>;
  workflowFilters: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: string;
  applicationNumber?: string;
}

function splitCsv(value: string): string[] {
  return value.includes(",") ? value.split(",") : [value];
}

export function buildIncidentInboxFilters(
  filtersArg: IncidentFilterInput,
  tenantId: string,
): IncidentFilterResult {
  const searchFilters: Record<string, unknown> = {};
  const workflowFilters: Record<string, unknown> = {};

  const {
    applicationNumber,
    mobileNumber,
    limit,
    offset,
    sortBy,
    sortOrder,
    applicationStatus,
    services,
    incidentType,
    incidentSubType,
    facility,
    assignee,
    nearingSLA,
    state,
    district,
    block,
    wfStatus,
  } = filtersArg ?? {};

  if (filtersArg?.IncidentWrappers) {
    searchFilters.applicationNumber = filtersArg.incidentId;
  }

  if (wfStatus) {
    let convertStatus = splitCsv(wfStatus);
    if (applicationStatus) {
      const applicationStatuses = splitCsv(applicationStatus);
      const intersectionStatuses = convertStatus.filter((status) =>
        applicationStatuses.includes(status),
      );
      convertStatus = intersectionStatuses.length ? intersectionStatuses : [""];
    }
    workflowFilters.status = convertStatus;
  } else if (applicationStatus) {
    workflowFilters.status = splitCsv(applicationStatus);
  }

  if (incidentType) {
    searchFilters.incidentType = splitCsv(incidentType);
  }

  if (incidentSubType) {
    searchFilters.incidentSubType = splitCsv(incidentSubType);
  }

  if (facility) {
    searchFilters.facility = splitCsv(facility);
  } else if (block) {
    searchFilters.block = splitCsv(block);
  } else if (district) {
    searchFilters.district = splitCsv(district);
  } else if (state) {
    searchFilters.state = splitCsv(state);
  }

  if (assignee) {
    workflowFilters.assignee = assignee;
  }

  if (mobileNumber) {
    searchFilters.mobileNumber = mobileNumber;
  }

  if (services) {
    workflowFilters.businessService = services;
  }

  searchFilters.tenantId = tenantId;

  if (nearingSLA) {
    searchFilters.nearingSLA = 3 * DAY;
  }

  workflowFilters.moduleName = "Incident";
  workflowFilters.tenantId = tenantId;

  return {
    searchFilters,
    workflowFilters,
    limit,
    offset,
    sortBy,
    sortOrder,
    applicationNumber,
  };
}

export function buildFilterQueryFromState(filters: {
  pgrfilters?: Record<string, Array<{ code: string }>>;
  wfFilters?: Record<string, Array<{ code: string }>>;
}): { pgrQuery: Record<string, string>; wfQuery: Record<string, string> } {
  const pgrQuery: Record<string, string> = {};
  const wfQuery: Record<string, string> = {};

  for (const property of Object.keys(filters.pgrfilters ?? {})) {
    const values = filters.pgrfilters?.[property];
    if (!Array.isArray(values)) {
      continue;
    }
    const params = values.map((item) => item.code).join(",");
    if (params) {
      pgrQuery[property] = params;
    }
  }

  for (const property of Object.keys(filters.wfFilters ?? {})) {
    const values = filters.wfFilters?.[property];
    if (!Array.isArray(values)) {
      continue;
    }
    const params = values.map((item) => item.code).join(",");
    if (params) {
      wfQuery[property] = params;
    }
  }

  return { pgrQuery, wfQuery };
}

export function flattenInboxFilters(
  searchParams: {
    filters?: {
      pgrQuery?: Record<string, string>;
      wfQuery?: Record<string, string>;
    };
    search?: Record<string, string> | string;
    limit?: number;
    offset?: number;
    nearingSLA?: boolean;
  },
  defaults: IncidentFilterInput,
): IncidentFilterInput {
  const pgrQuery = searchParams.filters?.pgrQuery ?? {};
  const wfQuery = searchParams.filters?.wfQuery ?? {};
  const search =
    typeof searchParams.search === "object" && searchParams.search
      ? searchParams.search
      : {};

  return {
    ...defaults,
    ...pgrQuery,
    ...wfQuery,
    ...search,
    limit: searchParams.limit,
    offset: searchParams.offset,
    nearingSLA: searchParams.nearingSLA,
    services: defaults.services ?? ["Incident"],
    sortOrder: defaults.sortOrder ?? "DESC",
  };
}
