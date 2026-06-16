import { useTranslate } from "@/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui";

export function HomePage() {
  const { t } = useTranslate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("ACTION_TEST_HOME")}
        </h1>
        <p className="text-muted-foreground">{t("CORE_COMMON_HOME")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("ES_COMMON_GETTING_STARTED")}</CardTitle>
          <CardDescription>{t("CORE_COMMON_HOME")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("ES_COMMON_NA")}: register new modules in src/modules.ts and follow
            MODULE_TEMPLATE.md.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
