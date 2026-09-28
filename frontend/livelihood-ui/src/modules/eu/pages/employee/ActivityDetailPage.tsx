import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Skeleton, TopBar } from "@/ui";
import { useMemo } from "react";
import { ActivityAssetSections } from "../../components/activity/ActivityAssetSections";
import { ActivityInfoCard } from "../../components/activity/ActivityInfoCard";
import { ActivityReportSection } from "../../components/activity/ActivityReportSection";
import { AuditTrailTimeline } from "../../components/activity/AuditTrailTimeline";
import { useActivityDetails } from "../../hooks/use-activity-details";
import { hasEuAccess } from "../../utils/access";
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
        <div className="livelihood-card px-6 py-16 text-center text-sm text-destructive">
          {extractApiErrorMessage(error) ??
            translateOr(t, "CS_ACTIVITY_FETCH_FAILED", "Failed to load this activity's report")}
        </div>
      ) : !detail ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_ACTIVITY_NOT_FOUND", "Activity not found")}
        </div>
      ) : (
        <>
          <ActivityInfoCard info={detail.info} />
          <AuditTrailTimeline auditTrail={detail.auditTrail} />
          <ActivityAssetSections activityId={activityId} sections={detail.assetSections} />
          <ActivityReportSection
            activityId={activityId}
            facilityName={detail.info.facilityName ?? facilityId}
            reportSection={detail.reportSection}
          />
        </>
      )}
    </div>
  );
}
