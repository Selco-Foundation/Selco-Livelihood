import { translateOr, useTranslate } from "@/shared";
import { Pagination, Skeleton } from "@/ui";
import { useNavigate } from "@tanstack/react-router";
import type { AmcReport } from "../types/amc-report";
import { amcReportDetailPath } from "../utils/paths";
import { AmcSlaBadge } from "./AmcSlaBadge";
import { AmcStatusBadge } from "./AmcStatusBadge";

interface AmcReportTableProps {
  /** Only reports waiting for review have an SLA. */
  showSla: boolean;
  /** Set when listing one project's reports, so the report's breadcrumb leads back to it. */
  projectId?: string;
  reports: AmcReport[];
  totalCount: number;
  isLoading: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function AmcReportTable({
  showSla,
  projectId,
  reports,
  totalCount,
  isLoading,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: Readonly<AmcReportTableProps>) {
  const { t } = useTranslate();
  const navigate = useNavigate();

  const columns = [
    translateOr(t, "ES_AMC_END_USER", "End user"),
    translateOr(t, "ES_AMC_PHONE_NUMBER", "Phone number"),
    translateOr(t, "CS_STATE", "State"),
    translateOr(t, "CS_DISTRICT", "District"),
    translateOr(t, "CS_BLOCK", "Block"),
    translateOr(t, "ES_AMC_NUMBER", "AMC No."),
    translateOr(t, "ES_AMC_REPORT_STATUS", "Report Status"),
    translateOr(t, "ES_AMC_VENDOR", "Vendor"),
    ...(showSla ? [translateOr(t, "ES_AMC_SLA_DAYS_REMAINING", "SLA days remaining")] : []),
  ];

  if (isLoading) {
    return (
      <div className="livelihood-card p-6">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="livelihood-card px-6 py-12 text-center text-sm text-muted-foreground">
        {translateOr(t, "ES_AMC_NO_REPORTS", "No AMC reports match these filters")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="livelihood-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((column) => (
                  <th key={column} className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr
                  key={report.id}
                  onClick={() =>
                    void navigate({ to: amcReportDetailPath(report.id), search: projectId ? { projectId } : {} })
                  }
                  className={
                    "cursor-pointer border-b border-border/70 hover:bg-muted/40" + (index % 2 === 1 ? " bg-accent" : "")
                  }
                >
                  <td className="px-5 py-4 font-semibold text-primary">{report.endUserName}</td>
                  <td className="px-5 py-4 text-foreground">{report.endUserPhone}</td>
                  <td className="px-5 py-4 text-foreground">{report.state}</td>
                  <td className="px-5 py-4 text-foreground">{report.district}</td>
                  <td className="px-5 py-4 text-foreground">{report.block}</td>
                  <td className="px-5 py-4 text-foreground">
                    {report.visitNumber} / {report.totalVisits ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <AmcStatusBadge status={report.status} approvedBy={report.approvedBy} />
                  </td>
                  <td className="px-5 py-4 text-foreground">{report.vendorName}</td>
                  {showSla ? (
                    <td className="px-5 py-4">
                      <AmcSlaBadge sla={report.sla} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalRecords={totalCount}
        pageSizeLimit={pageSize}
        onNextPage={() => onPageChange(currentPage + 1)}
        onPrevPage={() => onPageChange(Math.max(0, currentPage - 1))}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
