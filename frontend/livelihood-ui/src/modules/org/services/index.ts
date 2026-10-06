import { ORG_USE_MOCK_API } from "../constants/config";
import { organisationApi } from "./organisation-api";
import { organisationMockApi } from "./organisation-mock";

/**
 * The one place hooks get their org service from. Integration with the real
 * backend = set `ORG_USE_MOCK_API` to false (and verify `organisation-api.ts`
 * against the deployed vendor-registry); no screen or hook changes needed.
 */
export const orgService = ORG_USE_MOCK_API ? organisationMockApi : organisationApi;
