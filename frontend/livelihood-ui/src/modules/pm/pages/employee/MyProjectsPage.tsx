import { employeeHomePath, isProjectManager, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Pagination, TopBar } from "@/ui";
import { useState } from "react";
import { NewProjectButton } from "../../components/NewProjectButton";
import { ProjectSearch } from "../../components/ProjectSearch";
import { ProjectsTable } from "../../components/ProjectsTable";
import { useProjectsSearch } from "../../hooks/use-projects-search";

const DEFAULT_PAGE_SIZE = 10;

export function MyProjectsPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const [searchText, setSearchText] = useState("");
  const [pageOffset, setPageOffset] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const { data, isLoading } = useProjectsSearch({
    name: searchText || undefined,
    limit: pageSize,
    offset: pageOffset,
  });

  if (!isProjectManager(user?.roles)) {
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
        title={translateOr(t, "ES_PM_MY_PROJECTS", "My Projects")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "ES_PM_MY_PROJECTS", "My Projects") },
        ]}
        actions={<NewProjectButton />}
      />
      <ProjectSearch initialSearchText={searchText} onSearch={handleSearch} />
      <ProjectsTable projects={data?.projects ?? []} isLoading={isLoading} />
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
