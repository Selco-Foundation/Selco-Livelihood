import { getModuleOverviews } from "@/module-registry";

export function HomePage() {
  const overviews = getModuleOverviews();

  return (
    <div className="space-y-6">
      {overviews.map(({ Overview, moduleId }) => (
        <Overview key={moduleId} />
      ))}
    </div>
  );
}
