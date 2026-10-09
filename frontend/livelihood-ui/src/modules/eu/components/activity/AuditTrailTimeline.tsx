import { translateOr, useTranslate } from "@/shared";
import { Card, CardContent } from "@/ui";
import type { AuditCheckpoint } from "../../types/activity-detail";

interface AuditTrailTimelineProps {
  auditTrail: AuditCheckpoint[];
}

export function AuditTrailTimeline({ auditTrail }: AuditTrailTimelineProps) {
  const { t } = useTranslate();

  if (auditTrail.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">
          {translateOr(t, "AUDIT_TRAIL", "Audit Trail")}
        </h3>
        <div className="space-y-4">
          {auditTrail.map((checkpoint) => (
            <div key={checkpoint.id} className="border-l-2 border-border pl-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{checkpoint.status}</span>
                <span className="text-xs text-muted-foreground">{checkpoint.date}</span>
              </div>
              {checkpoint.actorName ? (
                <p className="text-xs text-muted-foreground">{checkpoint.actorName}</p>
              ) : null}
              {checkpoint.comment ? (
                <p className="mt-1 text-sm text-foreground">{checkpoint.comment}</p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
