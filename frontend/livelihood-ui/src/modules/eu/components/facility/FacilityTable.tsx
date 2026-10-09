import { translateOr, useTranslate } from "@/shared";
import { Pagination, Skeleton } from "@/ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { boundaryDisplayName } from "../../utils/boundary";
import type { Facility } from "../../types/facility";
import { euFacilityDetailPath } from "../../utils/paths";

interface FacilityTableProps {
  facilities: Facility[];
  isLoading: boolean;
  currentPage: number;
  totalRecords: number;
  pageSizeLimit: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function FacilityTable({
  facilities,
  isLoading,
  currentPage,
  totalRecords,
  pageSizeLimit,
  onNextPage,
  onPrevPage,
  onPageChange,
  onPageSizeChange,
}: FacilityTableProps) {
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
      {facilities.length === 0 ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_NO_END_USER_SITES_FOUND", "No end user sites found")}
        </div>
      ) : (
        <div className="livelihood-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_END_USER_SITE_ID", "End User Site ID")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "FACILITY_END_USER_NAME", "End User Name")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_STATE", "State")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_DISTRICT", "District")}
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold text-ink-950">
                    {translateOr(t, "CS_BLOCK", "Block")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility, index) => {
                  const detailPath = euFacilityDetailPath(facility.id);
                  return (
                    <tr
                      key={facility.id}
                      className={
                        "cursor-pointer " +
                        (index % 2 === 1 ? "border-b border-border/70 bg-accent" : "border-b border-border/70")
                      }
                      onClick={() => {
                        navigate({ to: detailPath }).catch(() => {});
                      }}
                    >
                      <td className="px-5 py-4 text-foreground">{facility.id || "-"}</td>
                      <td className="px-5 py-4 font-semibold text-foreground">
                        <Link
                          to={detailPath}
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {facility.facilityName || facility.pocName || "-"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {facility.stateCode ? boundaryDisplayName(facility.stateCode, t) : "-"}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {facility.districtCode ? boundaryDisplayName(facility.districtCode, t) : "-"}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {facility.blockCode ? boundaryDisplayName(facility.blockCode, t) : "-"}
                      </td>
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
