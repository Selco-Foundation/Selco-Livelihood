import { fetchMdmsMasters, tenantId, useAuthStore } from "@/shared";
import { useQuery } from "@tanstack/react-query";

export interface AssetTypeOption {
  code: string;
  name: string;
}

interface AssetTypeSchemaEntry {
  AssetType?: AssetTypeOption[];
}

/** The `asset-registry.AssetTypeSchema` MDMS master used for the asset-type dropdown. */
export function useAssetTypeOptions() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const { data, isLoading } = useQuery({
    queryKey: ["eu-asset-type-options"],
    enabled: Boolean(accessToken),
    queryFn: () =>
      fetchMdmsMasters(tenantId(), "asset-registry", ["AssetTypeSchema"], accessToken ?? undefined, user),
  });

  const schema = (data?.AssetTypeSchema as AssetTypeSchemaEntry[] | undefined)?.[0];

  return {
    isLoading,
    assetTypes: schema?.AssetType ?? [],
  };
}
