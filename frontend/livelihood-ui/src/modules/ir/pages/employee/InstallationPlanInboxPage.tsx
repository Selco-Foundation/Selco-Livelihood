import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Pagination, TopBar } from "@/ui";
import { useState } from "react";
import { InstallationPlanSearch } from "../../components/inbox/InstallationPlanSearch";
import { InstallationPlanTable } from "../../components/inbox/InstallationPlanTable";
import { useInstallationPlans } from "../../hooks/use-installation-plans";
import { hasIrAccess } from "../../utils/access";

const DEFAULT_PAGE_SIZE = 10;

export function InstallationPlanInboxPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const [searchText, setSearchText] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading } = useInstallationPlans({ searchText, pageOffset, pageSize });

  if (!hasIrAccess(user?.roles)) {
    return null;
  }

  const totalCount = data?.totalCount ?? 0;
  const currentPage = Math.floor(pageOffset / pageSize);

  function handleSearch(nextSearchText: string) {
    setSearchText(nextSearchText);
    setPageOffset(0);
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_IR_INSTALLATION_PLANS", "Installation Plans") },
        ]}
      />
      <InstallationPlanSearch
        initialSearchText={searchText}
        onSearch={handleSearch}
      />
      <InstallationPlanTable plans={data?.plans ?? []} isLoading={isLoading} />
      {totalCount > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalRecords={totalCount}
          pageSizeLimit={pageSize}
          onNextPage={() => setPageOffset(pageOffset + pageSize)}
          onPrevPage={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
          onPageChange={(page) => setPageOffset(page * pageSize)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
        />
      ) : null}
    </div>
  );
}
