-- End User Type (Livelihood): the MDMS code from facility.EndUserType, e.g. INDIVIDUAL / GROUP.
-- Stored as a column rather than inside facility_details/additional_details because it has to be
-- filterable - every FacilityBulkSearchCriteria filter maps to a real column, nothing filters JSONB.
ALTER TABLE facility
    ADD COLUMN IF NOT EXISTS end_user_type VARCHAR(32);

-- The field is mandatory from here on, but every row that already exists predates it. Without this
-- backfill those rows are retrospectively invalid, and the failure surfaces on Edit: an admin
-- changing a phone number would be blocked by a field that was never captured.
-- 'INDIVIDUAL' agreed as the default (2026-10-07); Group is the exceptional case in this programme.
UPDATE facility
SET end_user_type = 'INDIVIDUAL'
WHERE end_user_type IS NULL;

-- Unconditional NOT NULL is safe here only because this table holds Livelihood facilities and
-- nothing else (confirmed 2026-10-07). The service code still supports HEALTH and ANGANWADI
-- categories, for which End User Type is meaningless - if either is ever ingested into this
-- database, replace this with a category-scoped CHECK:
--   CHECK (upper(coalesce(facility_category,'')) <> 'LIVELIHOOD' OR end_user_type IS NOT NULL)
-- Worth knowing why it matters: facility creates are pushed to Kafka and persisted asynchronously,
-- so a constraint violation here would not reach the API caller. The create would return success
-- and the row would simply never appear.
ALTER TABLE facility
    ALTER COLUMN end_user_type SET NOT NULL;
