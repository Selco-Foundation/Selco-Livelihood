import { useTranslate } from "@/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui";

export function CreateIncidentPage() {
  const { t } = useTranslate();

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="livelihood-card">
        <CardHeader>
          <CardTitle>{t("ES_IM_NEW_INCIDENT")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Full incident creation flow is not implemented yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
