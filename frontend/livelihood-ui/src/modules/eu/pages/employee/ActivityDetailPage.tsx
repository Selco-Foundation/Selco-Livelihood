import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { ActivityInfoCard, AuditTrailTimeline, ReviewSectionsAccordion, Skeleton, TopBar } from "@/ui";
import { useMemo } from "react";
import { useActivityDetails, useLoadSectionMedia } from "../../hooks/use-activity-details";
import { hasEuAccess } from "../../utils/access";
import { boundaryDisplayName } from "../../utils/boundary";
import { euFacilitiesPath, euFacilityDetailPath } from "../../utils/paths";

// This route's path is computed at runtime via contextPath(), so there's no static
// `Route` export for typed params — read the facility id and activity id from the URL
// segments directly, same convention used by the facility detail page.
function useRouteParams(): { facilityId: string; activityId: string } {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const facilitiesIndex = segments.indexOf("facilities");
    const activitiesIndex = segments.indexOf("activities");
    return {
      facilityId: facilitiesIndex >= 0 ? decodeURIComponent(segments[facilitiesIndex + 1] ?? "") : "",
      activityId: activitiesIndex >= 0 ? decodeURIComponent(segments[activitiesIndex + 1] ?? "") : "",
    };
  }, []);
}

export function ActivityDetailPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const { facilityId, activityId } = useRouteParams();

  const { data: detail, isLoading, isError, error } = useActivityDetails(activityId);
  const loadSectionMedia = useLoadSectionMedia(activityId, facilityId);

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={translateOr(t, "ACTIVITY_REPORT", "Activity Report")}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "END_USER_SITES", "End User Sites"), to: euFacilitiesPath() },
          { label: facilityId, to: euFacilityDetailPath(facilityId) },
          { label: translateOr(t, "ACTIVITY_REPORT", "Activity Report") },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-destructive wrap-anywhere">
          {extractApiErrorMessage(error) ??
            translateOr(t, "CS_ACTIVITY_FETCH_FAILED", "Failed to load this activity's report")}
        </div>
      ) : !detail ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_ACTIVITY_NOT_FOUND", "Activity not found")}
        </div>
      ) : (
        <>
          <ActivityInfoCard
            activity={detail.info}
            resolveBoundaryName={(code) => boundaryDisplayName(code, t)}
          />
          <AuditTrailTimeline checkpoints={detail.auditTrail} />
          <ReviewSectionsAccordion
            sections={detail.sections}
            sectionDocuments={detail.sectionDocuments}
            loadSectionMedia={loadSectionMedia}
          />
        </>
      )}
    </div>
  );
}
