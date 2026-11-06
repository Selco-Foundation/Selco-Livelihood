-- Vendor assignment + OTP reference for IC Report (FR-07 / FR-11 / FR-13 notifications)
ALTER TABLE bom
  ADD COLUMN IF NOT EXISTS solution_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS vendor_org_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS vendor_email VARCHAR(256),
  ADD COLUMN IF NOT EXISTS vendor_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS otp_uuid VARCHAR(64),
  ADD COLUMN IF NOT EXISTS report_number VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_bom_vendor_org ON bom(vendor_org_id);
CREATE INDEX IF NOT EXISTS idx_bom_activity_facility ON bom(activity_facility_id);
