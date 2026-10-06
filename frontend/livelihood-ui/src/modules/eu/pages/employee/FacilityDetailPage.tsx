import { employeeHomePath, translateOr, useAuthStore, useTranslate } from "@/shared";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger, TopBar } from "@/ui";
import { useMemo, useState } from "react";
import { FacilityActivityTab } from "../../components/facility/FacilityActivityTab";
import { FacilityAssetTab } from "../../components/facility/FacilityAssetTab";
import { FacilityFormDialog } from "../../components/facility/FacilityFormDialog";
import { FacilityInfoSection } from "../../components/facility/FacilityInfoSection";
import { useFacilityDetails } from "../../hooks/use-facility-details";
import { hasEuAccess } from "../../utils/access";
import { euFacilitiesPath } from "../../utils/paths";

// This route's path is computed at runtime via contextPath(), so there's no static
// `Route` export for typed params — read the facility id from the URL segments
// directly, same convention as ir's FacilityEntryListPage.
function useFacilityIdFromRoute(): string {
  return useMemo(() => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("facilities");
    return index >= 0 ? decodeURIComponent(segments[index + 1] ?? "") : "";
  }, []);
}

export function FacilityDetailPage() {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const facilityId = useFacilityIdFromRoute();
  const [showEditFacility, setShowEditFacility] = useState(false);

  const { data: facility, isLoading } = useFacilityDetails(facilityId);

  if (!hasEuAccess(user?.roles)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <TopBar
        title={facilityId}
        breadcrumbs={[
          { label: translateOr(t, "CORE_COMMON_OVERVIEW", "Overview"), to: employeeHomePath() },
          { label: translateOr(t, "END_USER_SITES", "End User Sites"), to: euFacilitiesPath() },
          { label: facilityId },
        ]}
      />

      {isLoading || !facility ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <FacilityInfoSection facility={facility} onEdit={() => setShowEditFacility(true)} />

          <Tabs defaultValue="ACTIVITY">
            <TabsList>
              <TabsTrigger value="ACTIVITY">{translateOr(t, "CS_ACTIVITY_TYPE", "Activity")}</TabsTrigger>
              <TabsTrigger value="ASSET">{translateOr(t, "ASSET_TYPE", "Asset")}</TabsTrigger>
            </TabsList>
            <TabsContent value="ACTIVITY">
              <FacilityActivityTab facilityId={facilityId} facilityBoundaryCode={facility.boundaryCode} />
            </TabsContent>
            <TabsContent value="ASSET">
              <FacilityAssetTab facilityId={facilityId} facilityBoundaryCode={facility.boundaryCode} />
            </TabsContent>
          </Tabs>

          <FacilityFormDialog open={showEditFacility} onOpenChange={setShowEditFacility} facility={facility} />
        </>
      )}
    </div>
  );
}
