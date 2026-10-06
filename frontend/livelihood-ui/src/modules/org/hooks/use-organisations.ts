import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgService } from "../services";
import type {
  CreateOrganisationInput,
  Organisation,
  OrganisationSearchParams,
  UpdateOrganisationInput,
} from "../types/organisation";
import { useOrgApiContext } from "./use-org-api-context";

export const ORGANISATIONS_QUERY_KEY = "org-organisations";
export const ORGANISATION_DETAILS_QUERY_KEY = "org-organisation-details";
export const ORG_USERS_QUERY_KEY = "org-users";

export function useOrganisations(params: OrganisationSearchParams) {
  const { ctx } = useOrgApiContext();

  return useQuery({
    queryKey: [ORGANISATIONS_QUERY_KEY, params],
    enabled: Boolean(ctx),
    queryFn: () => orgService.searchOrganisations(params, ctx!),
    placeholderData: (previous) => previous,
  });
}

export function useOrganisationDetails(organisationId: string) {
  const { ctx } = useOrgApiContext();

  return useQuery({
    queryKey: [ORGANISATION_DETAILS_QUERY_KEY, organisationId],
    enabled: Boolean(ctx && organisationId),
    queryFn: () => orgService.getOrganisation(organisationId, ctx!),
  });
}

export function useCreateOrganisation() {
  const { ctx } = useOrgApiContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrganisationInput) => orgService.createOrganisation(input, ctx!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORGANISATIONS_QUERY_KEY] });
    },
  });
}

export function useUpdateOrganisation(organisation: Organisation | undefined) {
  const { ctx } = useOrgApiContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateOrganisationInput) =>
      orgService.updateOrganisation(organisation!, input, ctx!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORGANISATIONS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ORGANISATION_DETAILS_QUERY_KEY, organisation?.id] });
      // A PoC edit can change the matching user row too.
      void queryClient.invalidateQueries({ queryKey: [ORG_USERS_QUERY_KEY, organisation?.id] });
    },
  });
}

/** The organisation the logged-in user belongs to — the POC landing page. */
export function useOwnOrganisationId() {
  const { ctx, userUuid } = useOrgApiContext();

  return useQuery({
    queryKey: ["org-own-organisation", userUuid],
    enabled: Boolean(ctx && userUuid),
    queryFn: () => orgService.findOrganisationIdForUser(userUuid!, ctx!),
  });
}
