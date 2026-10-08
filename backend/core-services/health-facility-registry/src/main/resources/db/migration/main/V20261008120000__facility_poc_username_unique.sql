-- A POC username is the end user's login, so it has to be unique. FacilityService already checks
-- this at create time (validateFacilityPocUsernameUnique), but that is a read-then-write: two
-- concurrent creates can both pass and both insert. This makes the database the authority.
--
-- Scoped to the tenant, matching existsByFacilityPocUsername(tenantId, username, excludeFacilityId).
--
-- A partial index rather than a UNIQUE constraint, because health and anganwadi rows may have no
-- POC username at all. Postgres permits repeated NULLs under UNIQUE but not repeated '', so blanks
-- are excluded explicitly too.
--
-- Creation fails if duplicates already exist. Verified clean in dev (80 rows, 0 blank, 0 duplicate);
-- check each environment before deploying:
--   SELECT tenant_id, facility_poc_username, count(*) FROM facility
--   WHERE btrim(coalesce(facility_poc_username,'')) <> '' GROUP BY 1,2 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS facility_poc_username_tenant_uniq
    ON facility (tenant_id, facility_poc_username)
    WHERE facility_poc_username IS NOT NULL
      AND btrim(facility_poc_username) <> '';
