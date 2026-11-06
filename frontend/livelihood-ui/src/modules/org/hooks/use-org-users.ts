import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgService } from "../services";
import type { CreateOrgUserInput, OrgUser, UpdateOrgUserInput } from "../types/organisation";
import { useOrgApiContext } from "./use-org-api-context";
import { ORG_USERS_QUERY_KEY } from "./use-organisations";

export function useOrgUsers(organisationId: string) {
  const { ctx } = useOrgApiContext();

  return useQuery({
    queryKey: [ORG_USERS_QUERY_KEY, organisationId],
    enabled: Boolean(ctx && organisationId),
    queryFn: () => orgService.searchOrgUsers(organisationId, ctx!),
  });
}

function useInvalidateOrgUsers(organisationId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY, organisationId] });
}

export function useCreateOrgUser(organisationId: string) {
  const { ctx } = useOrgApiContext();
  const invalidate = useInvalidateOrgUsers(organisationId);

  return useMutation({
    mutationFn: (input: CreateOrgUserInput) => orgService.createOrgUser(input, ctx!),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateOrgUser(organisationId: string) {
  const { ctx } = useOrgApiContext();
  const invalidate = useInvalidateOrgUsers(organisationId);

  return useMutation({
    mutationFn: (input: UpdateOrgUserInput) => orgService.updateOrgUser(input, ctx!),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteOrgUser(organisationId: string) {
  const { ctx } = useOrgApiContext();
  const invalidate = useInvalidateOrgUsers(organisationId);

  return useMutation({
    mutationFn: (user: OrgUser) => orgService.deleteOrgUser(user, ctx!),
    onSuccess: () => void invalidate(),
  });
}
