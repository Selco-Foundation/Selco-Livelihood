-- Livelihood AMC layer (LLD 07 §7.1). Additive only.

-- 1. amc_configuration: one AMC per SOLAR installation row (facility_activities.id).
--    An end user can come back in a later installation plan of the same project once the first plan is
--    fully approved, so (tenant, facility, project, vendor) is not unique for Livelihood.
ALTER TABLE amc_configuration
    ADD COLUMN IF NOT EXISTS activity_facility_id VARCHAR(64);

-- Only one RUNNING AMC (PENDING_ACTIVATION or ACTIVE) per installation row; a new AMC may follow a
-- CANCELLED or COMPLETED one. Replaces E4H's (tenant, facility, project, vendor) WHERE status = 'ACTIVE',
-- which would block the second plan's AMC for the same end user and vendor.
DROP INDEX IF EXISTS ux_amc_configuration_unique_installation;

CREATE UNIQUE INDEX IF NOT EXISTS ux_amc_config_activity_facility
    ON amc_configuration (tenant_id, activity_facility_id)
    WHERE is_active
      AND activity_facility_id IS NOT NULL
      AND status IN ('PENDING_ACTIVATION', 'ACTIVE');

-- 2. scheduled_visits: the vendor org that does the visit, submission dates, who approved,
--    and two claim columns written only by targeted JDBC updates (never by the persister).
ALTER TABLE scheduled_visits
    ADD COLUMN IF NOT EXISTS vendor_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS first_submission_date BIGINT,
    ADD COLUMN IF NOT EXISTS latest_submission_date BIGINT,
    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(16),
    ADD COLUMN IF NOT EXISTS reminder_sent_at BIGINT,
    ADD COLUMN IF NOT EXISTS non_functional_notified_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_sv_vendor
    ON scheduled_visits (vendor_id);

-- Reviewer lists and the SLA filter: status = PENDING_APPROVAL and latest_submission_date < cutoff.
CREATE INDEX IF NOT EXISTS idx_sv_status_latest_sub
    ON scheduled_visits (status, latest_submission_date);

-- Reminder job: New visits not yet reminded, by due date.
CREATE INDEX IF NOT EXISTS idx_sv_reminder
    ON scheduled_visits (scheduled_date)
    WHERE reminder_sent_at IS NULL;
