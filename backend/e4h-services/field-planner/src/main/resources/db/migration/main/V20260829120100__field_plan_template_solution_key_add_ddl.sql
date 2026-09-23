-- field_plan_template holds the FILLED IC Report template -- what the Project Manager
-- actually entered -- as the per-plan counterpart to icc_templates' blank master. Like that
-- table it was created ahead of the feature, keyed on (system_type, total_capacity), and
-- never wired up. Re-keyed here on Solution for the same reason: the Livelihood flow works
-- per Solution, and one template is shared by every End User Site in the Plan running that
-- Solution (40 Pulverizer sites, one Pulverizer template).
--
-- Everything else the step needs is already here: field_plan_id with a real foreign key to
-- field_plans, a template_data JSONB, tenant_id, and audit columns.
ALTER TABLE field_plan_template ALTER COLUMN system_type DROP NOT NULL;

ALTER TABLE field_plan_template ALTER COLUMN total_capacity DROP NOT NULL;

-- The Project Manager's uploaded workbook is parsed and discarded rather than stored: nothing
-- downstream reads the file, and the download endpoint only ever serves the blank template,
-- so no code path needs to reproduce a filled one.
ALTER TABLE field_plan_template ALTER COLUMN file_store_id DROP NOT NULL;

-- The MDMS Installation.Solution code, matching field_plan_facilities.solution_id.
ALTER TABLE field_plan_template ADD COLUMN IF NOT EXISTS solution_id VARCHAR(64);

-- Optional, and left blank by most Plans.
ALTER TABLE field_plan_template ADD COLUMN IF NOT EXISTS tender_number VARCHAR(128);

-- Real columns rather than keys inside template_data because the Field Technician's Submit
-- step gates on purchase_order_number being non-empty; a column read keeps that check simple.
-- Neither field is enforced here or at Publish -- the technician can enter or correct both.
ALTER TABLE field_plan_template ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(128);

-- One template per (plan, Solution), and the ON CONFLICT target for the upsert: re-uploading
-- a corrected template must overwrite, never accumulate a second row. The pre-existing
-- idx_field_plan_template_field_plan already covers the plan-wide read that Publish
-- validation makes ("does every unique Solution in this Plan have a template?").
CREATE UNIQUE INDEX IF NOT EXISTS uniq_field_plan_template_solution
    ON field_plan_template (tenant_id, field_plan_id, solution_id);
