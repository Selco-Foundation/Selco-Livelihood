import { translateOr, useTranslate } from "@/shared";
import { Button, Card, CardContent } from "@/ui";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import type { Organisation } from "../../types/organisation";
import { OrgStatusBadge } from "../OrgStatusBadge";

function InfoItem({ label, value }: { label: string; value?: ReactNode }) {
  const { t } = useTranslate();
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-1/2 shrink-0 font-semibold text-foreground">{label}</span>
      <span className="min-w-0 wrap-break-word text-muted-foreground">
        {value || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}
      </span>
    </div>
  );
}

interface OrganisationInfoSectionProps {
  organisation: Organisation;
  /** Omit to hide the Edit action (POCs can't edit their organisation's details). */
  onEdit?: () => void;
}

export function OrganisationInfoSection({ organisation, onEdit }: OrganisationInfoSectionProps) {
  const { t } = useTranslate();

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">{organisation.name}</h2>
          {onEdit ? (
            <Button type="button" variant="outline" size="lg" onClick={onEdit}>
              <Pencil className="size-4" />
              {translateOr(t, "CORE_COMMON_EDIT", "Edit")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <InfoItem label={translateOr(t, "ORGANIZATION_CODE", "Organisation Code")} value={organisation.code} />
          <InfoItem
            label={translateOr(t, "ORGANIZATION_TYPE", "Organisation Type")}
            value={
              organisation.orgType === "PLATFORM"
                ? translateOr(t, "ORGANIZATION_TYPE_PLATFORM", "Platform Organisation")
                : translateOr(t, "ORGANIZATION_TYPE_VENDOR", "Vendor Organisation")
            }
          />
          <InfoItem
            label={translateOr(t, "ORGANIZATION_STATUS", "Status")}
            value={<OrgStatusBadge status={organisation.status} />}
          />
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <h3 className="mb-2 text-base font-semibold text-foreground">
            {translateOr(t, "ORG_POC_SECTION", "Point of Contact")}
          </h3>
          <div className="grid gap-2 md:grid-cols-2">
            <InfoItem label={translateOr(t, "ORGANIZATION_POC_NAME", "PoC Name")} value={organisation.pocName} />
            <InfoItem label={translateOr(t, "ORGANIZATION_POC_PHONE", "PoC Contact")} value={organisation.pocPhone} />
            <InfoItem label={translateOr(t, "ORGANIZATION_POC_EMAIL", "PoC Email")} value={organisation.pocEmail} />
            <InfoItem
              label={translateOr(t, "ORGANIZATION_POC_USERNAME", "PoC Username")}
              value={organisation.pocUsername}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
