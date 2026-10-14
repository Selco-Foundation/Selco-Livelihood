import { employeeHomePath, extractApiErrorMessage, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, TopBar } from "@/ui";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";
import { FacilityActivityTab } from "../../components/facility/FacilityActivityTab";
import { FacilityAssetTab } from "../../components/facility/FacilityAssetTab";
import { FacilityFormDialog } from "../../components/facility/FacilityFormDialog";
import { FacilityInfoSection } from "../../components/facility/FacilityInfoSection";
import { useFacilityDetails } from "../../hooks/use-facility-details";
import { hasEuAccess } from "../../utils/access";
import { euFacilitiesPath } from "../../utils/paths";

export function FacilityDetailPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  // This route's path is computed at runtime via contextPath(), so there's no static `Route`
  // export to call `Route.useParams()` on — `strict: false` reads the matched route's params
  // without needing one, and (unlike parsing window.location.pathname in a no-deps useMemo)
  // stays reactive if this component is ever reached via a param-only navigation.
  const { facilityId } = useParams({ strict: false }) as { facilityId?: string };
  const [showEditFacility, setShowEditFacility] = useState(false);

  const { data: facility, isLoading, isError, error } = useFacilityDetails(facilityId ?? "");

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={facilityId ?? ""}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "END_USER_SITES", "End User Sites"), to: euFacilitiesPath() },
          { label: facilityId ?? "" },
        ]}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-destructive">
          {extractApiErrorMessage(error) ?? translateOr(t, "CS_FACILITY_FETCH_FAILED", "Failed to load this end user site")}
        </div>
      ) : !facility ? (
        <div className="livelihood-card px-6 py-16 text-center text-sm text-muted-foreground">
          {translateOr(t, "CS_FACILITY_NOT_FOUND", "End user site not found")}
        </div>
      ) : (
        <>
          <FacilityInfoSection facility={facility} onEdit={() => setShowEditFacility(true)} />

          <Tabs defaultValue="ACTIVITY">
            <TabsList>
              <TabsTrigger value="ACTIVITY">{translateOr(t, "CS_ACTIVITY_TYPE", "Activity")}</TabsTrigger>
              <TabsTrigger value="ASSET">{translateOr(t, "ASSET_TYPE", "Asset")}</TabsTrigger>
            </TabsList>
            <TabsContent value="ACTIVITY">
              <FacilityActivityTab facilityId={facility.id} facilityBoundaryCode={facility.boundaryCode} />
            </TabsContent>
            <TabsContent value="ASSET">
              <FacilityAssetTab facilityId={facility.id} />
            </TabsContent>
          </Tabs>

          <FacilityFormDialog open={showEditFacility} onOpenChange={setShowEditFacility} facility={facility} />
        </>
      )}
    </div>
  );
}
