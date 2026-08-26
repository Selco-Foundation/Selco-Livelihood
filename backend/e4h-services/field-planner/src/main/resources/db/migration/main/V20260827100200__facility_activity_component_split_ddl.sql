-- One row per installable asset instead of one row per site, so each asset can be assigned
-- its own vendor and reviewed/approved independently: 1 SOLAR row plus one MACHINE row per
-- machine in the site's Solution (e.g. Oil Mill = SOLAR + MACHINE/1 press + MACHINE/2
-- pounding machine). The FACILITY_INSTALLATION workflow already keys on
-- facility_activities.id, so this reuses the live review mechanism unchanged.
--
-- Rows are created at the vendor assignment step, not at scope upload: the Project Manager
-- can add machines while editing the solution's IC report template, so the machine count is
-- only final after that step.
ALTER TABLE facility_activities ADD COLUMN component_type VARCHAR(16);     -- SOLAR | MACHINE
ALTER TABLE facility_activities ADD COLUMN component_sequence INT;         -- 1-based within a component_type
ALTER TABLE facility_activities ADD COLUMN solution_id VARCHAR(64);        -- denormalized from field_plan_facilities.solution_id

-- Both component columns stay NULL for pre-existing rows and for non-installation activity
-- types, which remain exactly one row per (facility, activity, plan). Postgres treats NULLs
-- as distinct in a unique index, so extending the key is backward-compatible.
-- solution_id is not part of the key: it is identical across all of a site's asset rows.
DROP INDEX IF EXISTS idx_facility_activities_composite;

CREATE UNIQUE INDEX idx_facility_activities_composite
    ON facility_activities (tenant_id, facility_id, activity_id, field_plan_id, component_type, component_sequence);

CREATE INDEX idx_facility_activities_solution ON facility_activities (tenant_id, solution_id);
