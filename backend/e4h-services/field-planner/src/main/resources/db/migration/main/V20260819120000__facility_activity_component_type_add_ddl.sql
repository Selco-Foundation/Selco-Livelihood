-- component_type distinguishes which vendor-assignable installation component this row is: SOLAR (the solar
-- bundle) or MACHINE (the Solution's associated machine(s) — a Solution with multiple machines, e.g. Oil Mill,
-- keeps them bundled into one MACHINE row's bom.data rather than splitting further, matching FR-07's "two rows
-- per facility, Machine + Solar" model). solution_id denormalizes the MDMS Solution code (e.g. SOL-PULVERIZER-001)
-- onto this row, matching the same solution_id convention already used by field_plan_facilities/installation_template/
-- bom, and known at the same point this row is created (right after FR-05 Scope assignment) — not part of the
-- unique index below since both the MACHINE and SOLAR row for one site+plan share the same solution_id.
-- Both columns are NULL for pre-existing rows and non-Installation activity types, which remain exactly one row
-- per (tenant_id, facility_id, activity_id, field_plan_id) as before — Postgres treats NULL as distinct in a
-- unique index, so existing rows are unaffected.
ALTER TABLE facility_activities ADD COLUMN component_type VARCHAR(16); -- SOLAR | MACHINE
ALTER TABLE facility_activities ADD COLUMN solution_id VARCHAR(64); -- MDMS Solution code

DROP INDEX IF EXISTS idx_facility_activities_composite;

CREATE UNIQUE INDEX idx_facility_activities_composite ON facility_activities (tenant_id, facility_id, activity_id, field_plan_id, component_type);
