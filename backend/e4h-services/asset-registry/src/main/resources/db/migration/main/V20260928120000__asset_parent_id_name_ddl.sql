-- Parent/child assets: a SOLAR parent groups its PANEL / BATTERY / INVERTER units so end users see
-- one "Solar" asset instead of every unit. parent_id is NULL for top-level assets (Solar parent, Machine).
ALTER TABLE asset ADD COLUMN IF NOT EXISTS parent_id VARCHAR(64);

-- Asset display name, previously only held in asset_details.name.
ALTER TABLE asset ADD COLUMN IF NOT EXISTS name VARCHAR(256);

CREATE INDEX IF NOT EXISTS idx_asset_parent_id ON asset (parent_id);

UPDATE asset
SET name = asset_details ->> 'name'
WHERE name IS NULL
  AND asset_details ->> 'name' IS NOT NULL;