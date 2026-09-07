import { useState } from "react";
import { Button, Input, PageHeader, Skeleton } from "@/ui";
import { LanguageSwitcher } from "@/modules/core";
import { useProjectsSearch } from "../../hooks/use-projects-search";
import { ProjectsTable } from "../../components/ProjectsTable";
import { ProjectsPagination } from "../../components/ProjectsPagination";

export function MyProjectsPage() {
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  const { data, isLoading } = useProjectsSearch({
    name: appliedSearch || undefined,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  function handleSearch() {
    setAppliedSearch(searchText);
    setCurrentPage(0);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(0);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Projects" action={<LanguageSwitcher />} />

      <div className="flex max-w-sm gap-2">
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search by project name"
          onKeyDown={(event) => event.key === "Enter" && handleSearch()}
        />
        <Button size="sm" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {isLoading ? (
        <div className="livelihood-card p-6">
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data && data.projects.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          No Projects Found
        </div>
      ) : data ? (
        <div className="livelihood-card overflow-hidden">
          <ProjectsTable data={data.projects} />
        </div>
      ) : null}

      {data && data.totalCount > 0 ? (
        <ProjectsPagination
          currentPage={currentPage}
          totalRecords={data.totalCount}
          pageSizeLimit={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={handlePageSizeChange}
        />
      ) : null}
    </div>
  );
}
