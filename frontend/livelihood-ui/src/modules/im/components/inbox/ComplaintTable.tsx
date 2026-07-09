import { contextPath, useAuthStore, useTranslate } from "@/shared";
import { cn } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { InboxRow } from "../../types/inbox";
import { isEndUser } from "../../utils/access";
import { translateDetailValue } from "../../utils/complaint-details";

interface ComplaintTableProps {
  data: InboxRow[];
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
}

function SlaBadge({ value, overdueLabel }: { value: string; overdueLabel: string }) {
  if (value === "-" || value === overdueLabel) {
    return <span className="livelihood-sla-badge-muted">{value === overdueLabel ? value : "-"}</span>;
  }
  return <span className="livelihood-sla-badge">{value}</span>;
}

export function ComplaintTable({
  data,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
}: ComplaintTableProps) {
  const { t } = useTranslate();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const slaColumnLabel = isEndUser(user?.roles)
    ? t("WF_INBOX_HEADER_DAYS_REMAINING")
    : t("WF_INBOX_HEADER_SLA_DAYS_REMAINING");
  const basePath = `/${contextPath()}/employee/im`;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSizeLimit));
  const canGoPrev = currentPage > 0;
  const canGoNext = (currentPage + 1) * pageSizeLimit < totalRecords;
  const overdueLabel = t("SLA_OVERDUE");

  const columns = [
    { key: "ticket", label: t("CS_COMMON_TICKET_NO") },
    { key: "endUser", label: t("INCIDENT_END_USER") },
    { key: "asset", label: t("INCIDENT_ASSET") },
    { key: "type", label: t("CS_TICKET_TYPE") },
    { key: "status", label: t("CS_TICKET_DETAILS_CURRENT_STATUS") },
    { key: "owner", label: t("WF_INBOX_HEADER_CURRENT_OWNER") },
    { key: "sla", label: slaColumnLabel },
  ] as const;

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-3.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const detailsPath = `${basePath}/complaint/details/${row.incidentId}/${row.tenantId}`;

              return (
                <tr
                  key={`${row.incidentId}-${row.tenantId}`}
                  className="cursor-pointer border-b border-border/70 hover:bg-muted/40"
                  onClick={() => {
                    navigate({ to: detailsPath }).catch(() => {});
                  }}
                >
                  <td className="px-5 py-4">
                    <div>
                      <Link
                        to={detailsPath}
                        className="font-semibold text-foreground hover:text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {row.incidentId}
                      </Link>
                      {row.potentialDuplicate ? (
                        <p className="mt-1 text-xs font-medium text-destructive">
                          {t("CS_INFO_POTENTIAL_DUPLICATE")}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-foreground">{row.endUser}</td>
                  <td className="px-5 py-4 text-foreground">
                    {translateDetailValue(row.assetLabel, t)}
                  </td>
                  <td className="px-5 py-4 text-foreground">
                    {t(`SERVICEDEFS.${row.incidentType.toUpperCase()}`)}
                  </td>
                  <td className="px-5 py-4 text-foreground">
                    {t(`CS_COMMON_${row.status}`)}
                  </td>
                  <td className="px-5 py-4 text-foreground">{row.taskOwner}</td>
                  <td className="px-5 py-4">
                    <SlaBadge value={row.sla} overdueLabel={overdueLabel} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={onPrevPage}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            {t("CS_COMMON_PREVIOUS")}
          </button>

          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm transition-colors",
                page === currentPage
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {page + 1}
            </button>
          ))}

          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNextPage}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            {t("CS_COMMON_NEXT")}
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
