import { translateOr, useTranslate } from "@/shared";
import { Card, CardContent } from "@/ui";
import type { ActivityInfo } from "../../types/activity-detail";

interface ActivityInfoCardProps {
  info: ActivityInfo;
}

export function ActivityInfoCard({ info }: ActivityInfoCardProps) {
  const { t } = useTranslate();

  const fields: Array<{ label: string; value?: string }> = [
    { label: translateOr(t, "CS_ACTIVITY_TYPE", "Activity Type"), value: info.activityType },
    { label: translateOr(t, "PROJECT_ID", "Project ID"), value: info.projectCode },
    { label: translateOr(t, "ACTIVITY_ID", "Activity ID"), value: info.fieldPlanCode },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <h2 className="text-lg font-semibold text-foreground">
          {info.facilityName || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}
        </h2>
        <div className="grid gap-2 md:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label} className="flex gap-3 text-sm">
              <span className="font-semibold text-foreground">{field.label}</span>
              <span className="text-muted-foreground">
                {field.value || translateOr(t, "CORE_COMMON_NOT_APPLICABLE", "N/A")}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
