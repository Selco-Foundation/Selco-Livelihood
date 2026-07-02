ALTER TABLE asset
    ADD COLUMN IF NOT EXISTS vendor_id CHARACTER VARYING(64),
    ADD COLUMN IF NOT EXISTS item_code CHARACTER VARYING(128),
    ADD COLUMN IF NOT EXISTS boundary_code CHARACTER VARYING(256);

CREATE INDEX IF NOT EXISTS idx_asset_facility_vendor
    ON asset (tenant_id, facility_id, vendor_id);

CREATE INDEX IF NOT EXISTS idx_asset_tenant_item_code
    ON asset (tenant_id, item_code);

CREATE INDEX IF NOT EXISTS idx_asset_tenant_boundary_code
    ON asset (tenant_id, boundary_code);

CREATE INDEX IF NOT EXISTS idx_asset_facility_boundary
    ON asset (facility_id, boundary_code);
