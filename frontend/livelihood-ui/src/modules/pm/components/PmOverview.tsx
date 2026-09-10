import { isProjectManager, useAuthStore } from "@/shared";
import { NewProjectButton } from "./NewProjectButton";

export function PmOverview() {
  const user = useAuthStore((state) => state.user);

  if (!isProjectManager(user?.roles)) {
    return null;
  }

  return <NewProjectButton />;
}
