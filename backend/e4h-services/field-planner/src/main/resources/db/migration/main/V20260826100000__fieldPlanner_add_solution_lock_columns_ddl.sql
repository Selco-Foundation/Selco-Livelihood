ALTER TABLE field_plan_facilities ADD COLUMN solution_id VARCHAR(64);
ALTER TABLE field_plan_facilities ADD COLUMN lock_status VARCHAR(32) DEFAULT 'UNLOCKED'; -- UNLOCKED | LOCKED
