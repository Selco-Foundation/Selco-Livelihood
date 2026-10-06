/**
 * While true, every org service call is served by the in-memory mock
 * (`services/organisation-mock.ts`) instead of vendor-registry, and every
 * logged-in user is treated as a Super Admin so the screens can be exercised
 * without the new roles existing yet.
 *
 * Flip to `false` once the backend tasks land — see `services/index.ts`.
 */
export const ORG_USE_MOCK_API = true;

/** Page size for the organisation list. */
export const ORG_DEFAULT_PAGE_SIZE = 10;

/** Page size for the user table on the organisation details page (client-side paging). */
export const ORG_USER_PAGE_SIZE = 10;

/** Debounce for the organisation name search, matching the E4H Management Hub. */
export const ORG_SEARCH_DEBOUNCE_MS = 350;
