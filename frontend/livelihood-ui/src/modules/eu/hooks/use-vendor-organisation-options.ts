import { tenantId, useAuthStore, useDebouncedValue } from "@/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchVendorOrganisations, type VendorOrganisationOption } from "../services/vendor-organisation";

/**
 * The Vendor Organization dropdown's options — real server-side `name` search (debounced), but
 * the endpoint itself never paginates (see `services/vendor-organisation.ts`), so there's no
 * `hasMore`/`loadMore` here, just the current query's full result set.
 *
 * `pinned` (the asset's own currently-mapped org, from `asset.vendor`) is merged in whenever it
 * isn't already present in the result, so the dropdown shows the right name immediately rather
 * than falling back to a blank placeholder before the first fetch resolves.
 */
export function useVendorOrganisationOptions(pinned?: VendorOrganisationOption) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["eu-vendor-organisation-options", debouncedQuery],
    enabled: Boolean(accessToken),
    queryFn: () => searchVendorOrganisations(debouncedQuery || undefined, tenantId(), accessToken!, user),
  });

  const fetched = data ?? [];
  const options =
    pinned && !fetched.some((option) => option.code === pinned.code) ? [pinned, ...fetched] : fetched;

  return { options, query, setQuery, isLoading };
}
