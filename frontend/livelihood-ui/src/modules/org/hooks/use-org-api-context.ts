import { useAuthStore } from "@/shared";
import type { OrgApiContext } from "../types/organisation";

/** Token + user every org service call needs; `ctx` is null until logged in. */
export function useOrgApiContext(): { ctx: OrgApiContext | null; userUuid?: string } {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  return {
    ctx: accessToken ? { accessToken, user } : null,
    userUuid: user?.uuid,
  };
}
