-- icc_templates holds the BLANK IC Report template for each Solution: one filestore file per
-- Solution, fetched and served whenever a Project Manager downloads a template (FR-08). The
-- table was created ahead of the feature and keyed on (system_type, total_system_capacity),
-- but the Livelihood flow selects a template by Solution -- the same value
-- field_plan_facilities.solution_id already stores -- so it is re-keyed here rather than
-- duplicated into a second table.
--
-- system_type loses NOT NULL because our rows carry no system type at all. The old columns
-- and their unique index are left in place rather than dropped: the table has never had a
-- single row or code reference, so they cost nothing, and with system_type NULL throughout
-- the old index constrains nothing (Postgres treats NULLs as distinct). Dropping schema is
-- the one change that cannot be walked back if an out-of-repo consumer turns up.
ALTER TABLE icc_templates ALTER COLUMN system_type DROP NOT NULL;

ALTER TABLE icc_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

ALTER TABLE icc_templates ADD COLUMN IF NOT EXISTS solution_code VARCHAR(64);

-- Denormalised from Installation.Solution purely so the seeded rows are readable when
-- someone inspects the table by hand; nothing joins on it.
ALTER TABLE icc_templates ADD COLUMN IF NOT EXISTS solution_name VARCHAR(256);

-- One blank template per Solution per tenant. Doubles as the lookup the download endpoint
-- makes on every request.
CREATE UNIQUE INDEX IF NOT EXISTS uk_icc_templates_solution
    ON icc_templates (tenant_id, solution_code);
