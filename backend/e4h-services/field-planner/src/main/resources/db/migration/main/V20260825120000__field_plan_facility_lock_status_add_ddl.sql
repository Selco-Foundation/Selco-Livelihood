-- FR-06 / FR-13: End User Site lock under an Installation Plan
ALTER TABLE field_plan_facilities
  ADD COLUMN IF NOT EXISTS lock_status VARCHAR(32) DEFAULT 'UNLOCKED',
  ADD COLUMN IF NOT EXISTS solution_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_field_plan_facilities_lock
  ON field_plan_facilities(tenant_id, facility_id, lock_status);
