ALTER TABLE eg_incident_v2
    ADD COLUMN IF NOT EXISTS asset_id CHARACTER VARYING(64),
    ADD COLUMN IF NOT EXISTS created_on_behalf BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS entry_channel CHARACTER VARYING(64);

CREATE INDEX IF NOT EXISTS idx_eg_incident_v2_asset_id
    ON eg_incident_v2 (tenantid, asset_id);

CREATE INDEX IF NOT EXISTS idx_eg_incident_v2_facility_asset
    ON eg_incident_v2 (facilityid, asset_id);
