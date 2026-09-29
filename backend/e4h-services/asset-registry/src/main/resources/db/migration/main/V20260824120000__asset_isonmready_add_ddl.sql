-- Per-asset O&M eligibility (distinct from is_operational)
ALTER TABLE asset ADD COLUMN IF NOT EXISTS is_onm_ready BOOLEAN DEFAULT FALSE;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS source_bom_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_asset_onm_ready ON asset(tenant_id, is_onm_ready);
CREATE INDEX IF NOT EXISTS idx_asset_source_bom ON asset(source_bom_id);
