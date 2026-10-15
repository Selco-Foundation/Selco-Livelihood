import { employeeHomePath, translateOr, useAuthStore, useDebouncedValue, useTranslate } from "@/shared";
import { TopBar } from "@/ui";
import { useEffect, useState } from "react";
import { NoOrgAccess } from "../../components/NoOrgAccess";
import { OrganisationFormDialog } from "../../components/organisation/OrganisationFormDialog";
import { OrganisationTable } from "../../components/organisation/OrganisationTable";
import { OrganisationToolbar } from "../../components/organisation/OrganisationToolbar";
import { ORG_DEFAULT_PAGE_SIZE, ORG_SEARCH_DEBOUNCE_MS } from "../../constants/config";
import { useOrganisations } from "../../hooks/use-organisations";
import type { OrgType } from "../../types/organisation";
import { hasOrgSuperAdminAccess } from "../../utils/access";

/** Shared Platform / Vendor organisation list — the two differ only by `orgType`. */
function OrganisationListPage({ orgType }: { orgType: OrgType }) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), ORG_SEARCH_DEBOUNCE_MS);
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(ORG_DEFAULT_PAGE_SIZE);
  const [showAdd, setShowAdd] = useState(false);

  // A new search always starts from the first page.
  useEffect(() => setPageOffset(0), [debouncedSearch]);

  const { data, isLoading } = useOrganisations({
    orgType,
    name: debouncedSearch || undefined,
    limit: pageSize,
    offset: pageOffset,
  });

  if (!hasOrgSuperAdminAccess(user?.roles)) {
    return <NoOrgAccess />;
  }

  const title =
    orgType === "PLATFORM"
      ? translateOr(t, "ORG_PLATFORM_ORGANIZATIONS", "Platform Organisations")
      : translateOr(t, "ORG_VENDOR_ORGANIZATIONS", "Vendor Organisations");

  return (
    <div className="flex flex-col gap-6">
      <TopBar
        title={title}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: title },
        ]}
      />

      <OrganisationToolbar orgType={orgType} search={search} onSearchChange={setSearch} onAdd={() => setShowAdd(true)} />

      <OrganisationTable
        organisations={data?.organisations ?? []}
        isLoading={isLoading}
        isSearching={Boolean(debouncedSearch)}
        currentPage={Math.floor(pageOffset / pageSize)}
        totalRecords={data?.total ?? 0}
        pageSizeLimit={pageSize}
        onNextPage={() => setPageOffset(pageOffset + pageSize)}
        onPrevPage={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
        onPageChange={(page) => setPageOffset(page * pageSize)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPageOffset(0);
        }}
      />

      <OrganisationFormDialog open={showAdd} onOpenChange={setShowAdd} orgType={orgType} />
    </div>
  );
}

export function PlatformOrganisationListPage() {
  return <OrganisationListPage orgType="PLATFORM" />;
}

export function VendorOrganisationListPage() {
  return <OrganisationListPage orgType="VENDOR" />;
}
