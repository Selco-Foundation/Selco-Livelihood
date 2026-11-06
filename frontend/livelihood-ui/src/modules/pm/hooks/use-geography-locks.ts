import { useAuthStore, useTranslate } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchGeographyLocks } from "../services/installation-plan";
import type { GeographyLock, GeographyLocksResponse, GeographyLockTarget } from "../types/installation-plan";
import { pmKeys } from "./query-keys";

function geographyLocksKey(target: GeographyLockTarget | undefined) {
  if (target && "fieldPlanId" in target) return pmKeys.planGeographyLocks(target.fieldPlanId);
  return pmKeys.projectGeographyLocks(target?.projectId);
}

function lockReason(lock: GeographyLock, t: ReturnType<typeof useTranslate>["t"]): string {
  const siteCount = lock.usedBy.reduce((total, usage) => total + (usage.siteCount ?? 0), 0);
  if (siteCount > 0) {
    return t("ES_PM_GEOGRAPHY_LOCKED_BY_SITES", {
      count: siteCount,
      defaultValue: "Cannot be removed: {{count}} end-user site(s) in this plan's scope are here",
    });
  }
  return t("ES_PM_GEOGRAPHY_LOCKED_BY_PLANS", {
    plans: lock.usedBy.map((usage) => usage.fieldPlanName ?? usage.fieldPlanId).join(", "),
    defaultValue: "Cannot be removed: used by installation plan {{plans}}",
  });
}

function useLocksQuery<T>(
  target: GeographyLockTarget | undefined,
  select: (response: GeographyLocksResponse) => T,
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: geographyLocksKey(target),
    enabled: Boolean(target && accessToken),
    staleTime: 0,
    queryFn: () => fetchGeographyLocks(target!, accessToken ?? undefined, user),
    select,
  });
}

/**
 * The geography codes that cannot be removed from a project or a plan, mapped to why -- ready for
 * MultiSelect's and SelectedGroup's `locked` prop. Never cached across visits (`staleTime: 0`): a
 * site removed from a plan's scope frees its geography, and the step must show that the next time
 * it opens. The backend re-checks on save either way.
 */
export function useGeographyLocks(target: GeographyLockTarget | undefined) {
  const { t } = useTranslate();
  return useLocksQuery(
    target,
    (response) =>
      new Map((response.GeographyLocks ?? []).map((lock) => [lock.code, lockReason(lock, t)])) as ReadonlyMap<
        string,
        string
      >,
  );
}

/**
 * A plan's sectors that cannot be removed (a scoped end-user site is in them), mapped to why. Shares
 * the geography locks' request -- one `_locks` call answers both.
 */
export function useSectorLocks(target: GeographyLockTarget | undefined) {
  const { t } = useTranslate();
  return useLocksQuery(
    target,
    (response) =>
      new Map(
        (response.SectorLocks ?? []).map((lock) => [
          lock.code,
          t("ES_PM_SECTOR_LOCKED_BY_SITES", {
            count: lock.usedBy.reduce((total, usage) => total + (usage.siteCount ?? 0), 0),
            defaultValue: "Cannot be removed: {{count}} end-user site(s) in this plan's scope are in this sector",
          }),
        ]),
      ) as ReadonlyMap<string, string>,
  );
}
