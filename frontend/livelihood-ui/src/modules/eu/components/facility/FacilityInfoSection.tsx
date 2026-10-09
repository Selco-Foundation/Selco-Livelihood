import { translateOr, useTranslate } from "@/shared";
import { Button, Card, CardContent } from "@/ui";
import { useFacilityMdmsOptions } from "../../hooks/use-facility-mdms-options";
import { boundaryDisplayName } from "../../utils/boundary";
import type { Facility } from "../../types/facility";

interface InfoItemProps {
  label: string;
  value?: string;
}

/**
 * Renders as two grid cells (label, value), not a wrapping element — the parent grid's own
 * column tracks are what make every row's value start at the same x position regardless of how
 * long any one row's label is, which a per-row flex split (each label taking a fixed % of just
 * its own row) can't do.
 */
function InfoItem({ label, value }: InfoItemProps) {
  const { t } = useTranslate();
  return (
    <>
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-muted-foreground">{value || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}</span>
    </>
  );
}

interface FacilityInfoSectionProps {
  facility: Facility;
  onEdit: () => void;
}

export function FacilityInfoSection({ facility, onEdit }: FacilityInfoSectionProps) {
  const { t } = useTranslate();
  const { facilityCategories, facilityTypes, solarSolutionDesignTypes } = useFacilityMdmsOptions();

  const categoryName = facilityCategories.find((c) => c.code === facility.facilityCategory)?.name;
  const typeName = facilityTypes.find((c) => c.code === facility.facilityType)?.name;
  const solarDesignName = solarSolutionDesignTypes.find((c) => c.code === facility.solarSolutionDesignType)?.name;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{facility.id}</h2>
          <Button type="button" variant="outline" onClick={onEdit}>
            {translateOr(t, "CORE_COMMON_EDIT", "Edit")}
          </Button>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm md:grid-cols-[auto_1fr_auto_1fr]">
          <InfoItem label={translateOr(t, "END_USER_SITE_NAME", "End User Site Name")} value={facility.facilityName} />
          <InfoItem label={translateOr(t, "END_USER_SITE_CATEGORY", "End User Site Category")} value={categoryName} />
          <InfoItem label={translateOr(t, "FACILITY_TYPE", "Sector")} value={typeName} />
          <InfoItem
            label={translateOr(t, "FACILITY_SOLAR_SOLUTION_DESIGN_TYPE", "Solar Solution Design Type")}
            value={solarDesignName}
          />
          <InfoItem label={translateOr(t, "FACILITY_POC_NAME", "POC Name")} value={facility.pocName} />
          <InfoItem label={translateOr(t, "FACILITY_POC_USERNAME", "POC Username")} value={facility.pocUsername} />
          <InfoItem label={translateOr(t, "FACILITY_POC_PHONE", "POC Phone")} value={facility.pocPhone} />
          <InfoItem label={translateOr(t, "FACILITY_POC_EMAIL", "POC Email")} value={facility.pocEmail} />
          <InfoItem
            label={translateOr(t, "FACILITY_IS_OPERATIONAL", "Operational")}
            value={
              facility.isActive === undefined
                ? undefined
                : facility.isActive
                  ? translateOr(t, "TL_COMMON_YES", "Yes")
                  : translateOr(t, "TL_COMMON_NO", "No")
            }
          />
          <InfoItem
            label={translateOr(t, "FACILITY_IS_ONM_READY", "ONM Ready")}
            value={
              facility.isOnmReady === undefined
                ? undefined
                : facility.isOnmReady
                  ? translateOr(t, "TL_COMMON_YES", "Yes")
                  : translateOr(t, "TL_COMMON_NO", "No")
            }
          />
          <InfoItem label={translateOr(t, "FACILITY_LATITUDE", "Latitude")} value={facility.latitude?.toString()} />
          <InfoItem label={translateOr(t, "FACILITY_LONGITUDE", "Longitude")} value={facility.longitude?.toString()} />
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h3 className="mb-2 text-base font-semibold text-foreground">
            {translateOr(t, "GEOGRAPHY_DETAILS", "Geography Details")}
          </h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm md:grid-cols-[auto_1fr_auto_1fr_auto_1fr]">
            <InfoItem
              label={translateOr(t, "CS_STATE", "State")}
              value={facility.stateCode ? boundaryDisplayName(facility.stateCode, t) : undefined}
            />
            <InfoItem
              label={translateOr(t, "CS_DISTRICT", "District")}
              value={facility.districtCode ? boundaryDisplayName(facility.districtCode, t) : undefined}
            />
            <InfoItem
              label={translateOr(t, "CS_BLOCK", "Block")}
              value={facility.blockCode ? boundaryDisplayName(facility.blockCode, t) : undefined}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
