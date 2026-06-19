import { employeeHomePath, loadModules, useAuthStore, useTranslate } from "@/shared";
import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DesktopInbox } from "../../components/inbox/DesktopInbox";
import { buildDefaultInboxRoleFilters } from "../../hooks/inbox-defaults";
import { useImInboxData } from "../../hooks/use-im-inbox-summary";
import type { ImInboxFilters } from "../../types/inbox";

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

export function InboxPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const routeSearch = useSearch({ strict: false }) as {
    filter?: string;
    pageOffset?: number;
    pageSize?: number;
    nearing?: string;
  };

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
    void loadModules(["rainmaker-im"]);
  }, []);

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

  const handleFilterChange = (nextFilters: ImInboxFilters) => {
    setSearchParams((prev) => ({ ...prev, filters: nextFilters }));
  };

  const onSearch = (params: Record<string, string>) => {
    setSearchParams((prev) => ({ ...prev, search: params }));
  };

  if (!complaints && isLoading) {
    return <div className="text-sm text-muted-foreground">{t("CS_COMMON_LOADING")}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("ES_COMMON_INBOX")}</h1>
        <Link to={employeeHomePath()} className="text-sm text-[#9e1b32] hover:underline">
          {t("CS_COMMON_BACK")}
        </Link>
      </div>
      <DesktopInbox
        data={complaints}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onSearch={onSearch}
        searchParams={searchParams}
        onNextPage={() => setPageOffset((prev) => prev + pageSize)}
        onPrevPage={() => setPageOffset((prev) => Math.max(0, prev - pageSize))}
        onPageSizeChange={setPageSize}
        currentPage={Math.floor(pageOffset / pageSize)}
        totalRecords={totalRecords}
        pageSizeLimit={pageSize}
      />
    </div>
  );
}
