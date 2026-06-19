import { contextPath, useTranslate } from "@/shared";
import { Badge, Button, DataTable } from "@/ui";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { InboxRow } from "../../types/inbox";

interface ComplaintTableProps {
  data: InboxRow[];
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ComplaintTable({
  data,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageSizeChange,
}: ComplaintTableProps) {
  const { t } = useTranslate();
  const basePath = `/${contextPath()}/employee/im`;

  const columns = useMemo<ColumnDef<InboxRow>[]>(
    () => [
      {
        id: "incidentId",
        header: t("CS_COMMON_TICKET_NO"),
        cell: ({ row }) => (
          <div>
            <Link
              to={`${basePath}/complaint/details/${row.original.incidentId}/${row.original.tenantId}`}
              className="font-medium text-[#7a2829] hover:underline"
            >
              {row.original.incidentId}
            </Link>
            {row.original.potentialDuplicate ? (
              <Badge variant="destructive" className="mt-1">
                {t("CS_INFO_POTENTIAL_DUPLICATE")}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "incidentType",
        header: t("CS_TICKET_TYPE"),
        cell: ({ row }) => t(`SERVICEDEFS.${row.original.incidentType.toUpperCase()}`),
      },
      {
        id: "incidentSubType",
        header: t("CS_TICKET_SUB_TYPE"),
        cell: ({ row }) => t(`SERVICEDEFS.${row.original.incidentSubType.toUpperCase()}`),
      },
      {
        id: "status",
        header: t("CS_TICKET_DETAILS_CURRENT_STATUS"),
        cell: ({ row }) => t(`CS_COMMON_${row.original.status}`),
      },
      {
        id: "facility",
        header: t("CS_COMPLAINT_PHC_TYPE"),
        cell: ({ row }) => t(row.original.facility),
      },
      {
        id: "taskOwner",
        header: t("WF_INBOX_HEADER_CURRENT_OWNER"),
        cell: ({ row }) => row.original.taskOwner,
      },
      {
        id: "sla",
        header: t("WF_INBOX_HEADER_SLA_DAYS_REMAINING"),
        cell: ({ row }) => {
          const sla = row.original.sla;
          if (sla === t("SLA_OVERDUE")) {
            return <span className="font-semibold text-destructive">{sla}</span>;
          }
          return sla;
        },
      },
    ],
    [basePath, t],
  );

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSizeLimit));
  const canGoPrev = currentPage > 0;
  const canGoNext = (currentPage + 1) * pageSizeLimit < totalRecords;

  return (
    <div className="space-y-4">
      <DataTable columns={columns} data={data} emptyMessage={t("CS_INBOX_NOTHING_TO_SHOW")} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span>{t("CS_COMMON_ROWS_PER_PAGE")}</span>
          <select
            className="rounded-md border bg-background px-2 py-1"
            value={pageSizeLimit}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {[10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span>
            {t("CS_COMMON_PAGE")} {currentPage + 1} / {totalPages}
          </span>
          <Button type="button" variant="outline" disabled={!canGoPrev} onClick={onPrevPage}>
            {t("CS_COMMON_PREVIOUS")}
          </Button>
          <Button type="button" variant="outline" disabled={!canGoNext} onClick={onNextPage}>
            {t("CS_COMMON_NEXT")}
          </Button>
        </div>
      </div>
    </div>
  );
}
