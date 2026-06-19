import { getModuleHomeCards } from "@/module-registry";
import { useTranslate } from "@/shared";

export function HomePage() {
  const { t } = useTranslate();
  const homeCards = getModuleHomeCards();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("ACTION_TEST_HOME")}
        </h1>
        <p className="text-muted-foreground">{t("CORE_COMMON_HOME")}</p>
      </div>

      {homeCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {homeCards.map(({ Card, moduleId }) => (
            <Card key={moduleId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
