-- A Field Plan carries one or more Sectors, not exactly one.
--
-- The single-sector column this replaces (V20260826110000) rested on the belief that an end-user
-- site had no Sector of its own, so a Sector could not be resolved per site in the Installation
-- Scope step and had to be fixed once for the whole Plan. That belief was wrong: every facility
-- already carries its Sector as facility.facility_type, set at ingestion from the "Sectors"
-- column. With that corrected, the Scope Excel takes each row's Sector from the site itself and
-- filters that row's Solution dropdown accordingly, so a Plan is free to span several Sectors --
-- which is what PRD FR-04 ("One or more Sectors") and the LLD's own ER diagram (jsonb sectors)
-- specified all along.
--
-- JSONB rather than a join table or text[], matching how this table already stores its other
-- multi-valued fields (geography_scope, selected_activities).
ALTER TABLE field_plans ADD COLUMN IF NOT EXISTS sectors JSONB DEFAULT '[]';

-- Carry each existing plan's single sector over as a one-element array. Plans created before the
-- write path was fixed have sector NULL and are left empty -- there is nothing to recover.
UPDATE field_plans
   SET sectors = jsonb_build_array(sector)
 WHERE sector IS NOT NULL
   AND btrim(sector) <> ''
   AND (sectors IS NULL OR sectors = '[]'::jsonb);

-- The out-of-repo persister mapping (Configs-Livelihood/egov-persister/field-plan-persister.yml)
-- names this column in its INSERT, so that config must ship with this migration. If it does not,
-- every plan-create fails inside the Kafka consumer rather than at the API -- the same silent
-- write loss this column already suffered once.
ALTER TABLE field_plans DROP COLUMN IF EXISTS sector;
