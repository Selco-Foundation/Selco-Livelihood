import {
  contextPath,
  employeeHomePath,
  useAuthStore,
  useTranslate,
} from "@/shared";
import { Button, PageHeader } from "@/ui";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImBreadcrumbs } from "../../components/ImBreadcrumbs";
import { DesktopInbox } from "../../components/inbox/DesktopInbox";
import { buildDefaultInboxRoleFilters } from "../../hooks/inbox-defaults";
import { useImInboxData } from "../../hooks/use-im-inbox-summary";
import type { ImInboxFilters } from "../../types/inbox";
import { canCreateIncident } from "../../utils/access";

function parseFilterParam(filter?: string): ImInboxFilters | null {
  if (!filter) {
    return null;
  }
  try {
    const parsed = JSON.parse(filter) as { filters?: ImInboxFilters };
    return parsed.filters ?? null;
  } catch {
    return null;
  }
}

function translateOr(
  t: (key: string) => string,
  key: string,
  fallback: string,
): string {
  const value = t(key);
  return value === key ? fallback : value;
}

export function InboxPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const basePath = `/${contextPath()}/employee/im`;
  const routeSearch = useSearchParams();

  const defaultFilters = buildDefaultInboxRoleFilters(user);
  const parsedFilter = parseFilterParam(routeSearch.filter);

  const [searchParams, setSearchParams] = useState<{
    filters?: ImInboxFilters;
    search?: Record<string, string> | string;
    sort?: Record<string, unknown>;
  }>(
    parsedFilter
      ? { filters: parsedFilter }
      : {
          filters: defaultFilters,
          search: "",
          sort: {},
        },
  );

  const [pageOffset, setPageOffset] = useState(routeSearch.pageOffset || 0);
  const [pageSize, setPageSize] = useState(routeSearch.pageSize || 10);
  const prevSearchParamsRef = useRef(JSON.stringify(searchParams));
  const prevPageSizeRef = useRef(pageSize);

  useEffect(() => {
    const query = new URLSearchParams();
    if (routeSearch.nearing === "1") {
      query.set("nearing", "1");
    }
    query.set("filter", JSON.stringify(searchParams));
    query.set("pageSize", String(pageSize));
    query.set("pageOffset", String(pageOffset));

    const nextSearch = query.toString();
    const currentSearch = window.location.search.replace(/^\?/, "");
    if (nextSearch !== currentSearch) {
      const nextUrl = `${window.location.pathname}?${nextSearch}`;
      window.history.replaceState(null, "", nextUrl);
    }
  }, [searchParams, pageSize, pageOffset, routeSearch.nearing]);

  useEffect(() => {
    const current = JSON.stringify(searchParams);
    if (prevSearchParamsRef.current !== current || prevPageSizeRef.current !== pageSize) {
      setPageOffset(0);
      prevSearchParamsRef.current = current;
      prevPageSizeRef.current = pageSize;
    }
  }, [searchParams, pageSize]);

  const inboxParams = {
    ...searchParams,
    limit: pageSize,
    offset: pageOffset,
    ...(routeSearch.nearing === "1" ? { nearingSLA: true } : {}),
  };

  const { data: complaints, isLoading } = useImInboxData(inboxParams);
  const totalRecords = complaints?.total ?? 0;
  const canCreateTicket = canCreateIncident(user?.roles);

  const handleFilterChange = (nextFilters: ImInboxFilters) => {
    setSearchParams((prev) => ({ ...prev, filters: nextFilters }));
  };

  const homePath = employeeHomePath();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <ImBreadcrumbs
        items={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: homePath },
          { label: translateOr(t, "ES_IM_INBOX", "Inbox") },
        ]}
      />

      <PageHeader
        title={translateOr(t, "ES_IM_ALL_TICKETS", "All Tickets")}
        description={translateOr(
          t,
          "ES_IM_INBOX_DESCRIPTION",
          "View and track all your service requests.",
        )}
        action={
          canCreateTicket ? (
            <Button asChild className="gap-2 rounded-md px-5">
              <Link to={`${basePath}/incident/create`}>
                <Plus className="size-4" />
                {translateOr(t, "ES_IM_RAISE_NEW_TICKET", "Raise new ticket")}
              </Link>
            </Button>
          ) : null
        }
      />

      <DesktopInbox
        data={complaints}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        searchParams={searchParams}
        onNextPage={() => setPageOffset((prev) => prev + pageSize)}
        onPrevPage={() => setPageOffset((prev) => Math.max(0, prev - pageSize))}
        onPageChange={(page) => setPageOffset(page * pageSize)}
        currentPage={Math.floor(pageOffset / pageSize)}
        totalRecords={totalRecords}
        pageSizeLimit={pageSize}
      />
    </div>
  );
}

function useSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    filter: params.get("filter") ?? undefined,
    pageOffset: Number(params.get("pageOffset") ?? 0),
    pageSize: Number(params.get("pageSize") ?? 10),
    nearing: params.get("nearing") ?? undefined,
  };
}
