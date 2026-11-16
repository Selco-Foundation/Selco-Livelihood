package org.egov.amc.livelihood;

import org.egov.amc.web.models.ScheduledVisit;

/**
 * Builds the object sent on {@code update-scheduled-visit} from a visit loaded through search.
 *
 * <p>The persister update writes every listed column unconditionally, so a field left out of the
 * update object is written as NULL. E4H rebuilt the visit from a short whitelist, which wiped
 * {@code additional_details}-only data and would wipe the Livelihood columns (LLD review A4, A14).
 * Every persisted column is copied here; callers change only what their step changes.
 *
 * <p>Not copied on purpose: read-only joins (amcConfiguration, facility, boundary names, mapped
 * vendor), workflow/processInstances/transactions (not columns), and auditDetails (set by
 * enrichment on update). {@code reminder_sent_at} and {@code non_functional_notified_at} are not on
 * the model: they are written by targeted JDBC updates only and the persister never touches them.
 */
public final class VisitRowCopy {

    private VisitRowCopy() {
    }

    public static ScheduledVisit.ScheduledVisitBuilder fullRow(ScheduledVisit visit) {
        return ScheduledVisit.builder()
                .id(visit.getId())
                .tenantId(visit.getTenantId())
                .projectId(visit.getProjectId())
                .amcConfigurationId(visit.getAmcConfigurationId())
                .facilityId(visit.getFacilityId())
                .facilityName(visit.getFacilityName())
                .visitNumber(visit.getVisitNumber())
                .scheduledDate(visit.getScheduledDate())
                .actualVisitDate(visit.getActualVisitDate())
                .lastVisitDate(visit.getLastVisitDate())
                .status(visit.getStatus())
                .isActive(visit.getIsActive())
                .visitReport(visit.getVisitReport())
                .additionalDetails(visit.getAdditionalDetails())
                .assignments(visit.getAssignments())
                .vendorId(visit.getVendorId())
                .firstSubmissionDate(visit.getFirstSubmissionDate())
                .latestSubmissionDate(visit.getLatestSubmissionDate())
                .approvedBy(visit.getApprovedBy());
    }
}
