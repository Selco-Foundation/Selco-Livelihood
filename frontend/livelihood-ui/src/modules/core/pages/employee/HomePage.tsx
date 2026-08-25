import { getModuleOverviews } from "@/module-registry";

export function HomePage() {
  const { kpis, details } = getModuleOverviews();

  return (
    <div className="space-y-6">
      {kpis.length > 0 ? (
        <div className="flex gap-3 lg:flex-wrap lg:gap-4">
          {kpis.map(({ Component, moduleId }) => (
            <Component key={moduleId} />
          ))}
        </div>
      ) : null}
      {details.map(({ Component, moduleId }) => (
        <Component key={moduleId} />
      ))}
    </div>
  );
}
