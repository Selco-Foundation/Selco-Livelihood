import { getModuleOverviews } from "@/module-registry";

export function HomePage() {
  const overviews = getModuleOverviews();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {overviews.map(({ Overview, moduleId }) => (
        <Overview key={moduleId} />
      ))}
    </div>
  );
}
