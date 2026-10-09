import { translateOr, useTranslate } from "@/shared";
import { Pagination, Skeleton } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Organisation } from "../../types/organisation";
import { orgDetailPath } from "../../utils/paths";
import { OrgStatusBadge } from "../OrgStatusBadge";

interface OrganisationTableProps {
  organisations: Organisation[];
  isLoading: boolean;
  isSearching: boolean;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const HEADER_CELL = "px-5 py-3 text-left text-sm font-semibold text-ink-950";

export function OrganisationTable({
  organisations,
  isLoading,
  isSearching,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: OrganisationTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {organisations.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {isSearching
            ? translateOr(t, "ORG_NO_SEARCH_RESULTS", "No organisations match your search")
            : translateOr(t, "CS_NO_ORGANIZATIONS_FOUND", "No organisations found")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_NAME", "Organisation Name")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_CODE", "Organisation Code")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_STATUS", "Status")}</th>
                  <th className={HEADER_CELL}>{translateOr(t, "ORG_POC_NAME", "PoC Name")}</th>
                </tr>
              </thead>
              <tbody>
                {organisations.map((organisation, index) => {
                  const detailPath = orgDetailPath(organisation.id);
                  return (
                    <tr
                      key={organisation.id}
                      className={
                        "cursor-pointer border-b border-border/70 " + (index % 2 === 1 ? "bg-accent" : "")
                      }
                      onClick={() => {
                        navigate({ to: detailPath }).catch(() => {});
                      }}
                    >
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <Link
                          to={detailPath}
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {organisation.name || "-"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-foreground">{organisation.code || "-"}</td>
                      <td className="px-5 py-4">
                        <OrgStatusBadge status={organisation.status} />
                      </td>
                      <td className="px-5 py-4 text-foreground">{organisation.pocName || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalRecords > 0 ? (
        <Pagination
          currentPage={currentPage}
          totalRecords={totalRecords}
          pageSizeLimit={pageSizeLimit}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
