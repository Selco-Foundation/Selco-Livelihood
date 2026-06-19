import { useTranslate } from "@/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui";

export function CreateIncidentPage() {
  const { t } = useTranslate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ES_IM_NEW_INCIDENT")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t("ES_COMMON_NA")}: full incident creation flow is not implemented yet.
        </p>
      </CardContent>
    </Card>
  );
}
