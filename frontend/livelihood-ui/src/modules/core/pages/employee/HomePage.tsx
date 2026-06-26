import { getModuleHomeCards } from "@/module-registry";
import { useTranslate } from "@/shared";
import { PageHeader } from "@/ui";

export function HomePage() {
  const { t } = useTranslate();
  const homeCards = getModuleHomeCards();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title={t("ACTION_TEST_HOME")}
      />

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
