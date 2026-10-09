import { organisationApi } from "./organisation-api";

/** The one place hooks get their org service from — the vendor-registry client. */
export const orgService = organisationApi;
