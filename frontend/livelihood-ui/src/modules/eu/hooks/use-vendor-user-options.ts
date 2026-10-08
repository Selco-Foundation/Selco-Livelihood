import { tenantId, useAuthStore } from "@/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchVendorOrgUsers, type VendorUserOption } from "../services/vendor";

const PAGE_SIZE = 10;

/**
 * The Vendor dropdown's options for a given organization — real offset/limit pagination (see
 * `services/vendor.ts`), accumulated page by page via `useInfiniteQuery`. The caller is expected
 * to remount this (e.g. `key={organizationId}` on the component using it) whenever the selected
 * organization changes, rather than this hook trying to reset its own accumulated pages mid-flight.
 *
 * `pinned` (the asset's own currently-mapped vendor, from `asset.vendor`) is merged in whenever it
 * isn't already present in the loaded pages, so the dropdown shows the right name immediately
 * rather than requiring the user to page all the way to it first.
 */
export function useVendorUserOptions(organizationId: string | undefined, pinned?: VendorUserOption) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["eu-vendor-user-options", organizationId],
    enabled: Boolean(accessToken) && Boolean(organizationId),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      searchVendorOrgUsers(organizationId!, tenantId(), PAGE_SIZE, pageParam, accessToken!, user),
    getNextPageParam: (lastPage, allPages) => {
      // Must advance by the raw rows each page actually returned, not by `options.length` — a
      // page with any non-vendor-role rows filtered out would otherwise make the next request
      // re-read rows already consumed, and `hasMore` would never settle to false.
      const rawLoaded = allPages.reduce((sum, page) => sum + page.rawCount, 0);
      return rawLoaded < lastPage.total ? rawLoaded : undefined;
    },
  });

  const fetched = (data?.pages ?? []).flatMap((page) => page.options);
  const options = pinned && !fetched.some((option) => option.code === pinned.code) ? [pinned, ...fetched] : fetched;

  return {
    options,
    hasMore: Boolean(hasNextPage),
    loadMore: () => void fetchNextPage(),
    isLoading: isLoading || isFetchingNextPage,
  };
}
