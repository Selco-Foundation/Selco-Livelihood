package org.egov.amc.livelihood;

import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;
import org.egov.amc.web.models.AssetAmc;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.common.contract.models.AuditDetails;

import java.util.ArrayList;
import java.util.List;

import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_ACTIVE;

/**
 * What activation writes, built as plain objects (LLD 07 §6.3): the configuration made ACTIVE with its dates,
 * visit 1 (fixed id, SCHEDULED, due = start + frequency) assigned to the AMC's field staff, and the asset_amc
 * link to the SOLAR asset. The caller persists all three in one message (one DB transaction).
 */
public record ActivationPlan(AmcConfiguration configuration, ScheduledVisit firstVisit, AssetAmc assetAmc) {

    /**
     * @param stored     the configuration as loaded (full row; activation changes only status and dates)
     * @param startDay   00:00 IST of the start day
     * @param assetId    the SOLAR parent asset
     * @param audit      audit for rows written now (created = last modified = now, by the acting user)
     */
    public static ActivationPlan of(AmcConfiguration stored, long startDay, String assetId, AuditDetails audit) {
        long end = AmcSchedule.plusMonths(startDay, stored.getDurationMonths());
        long firstDue = AmcSchedule.plusMonths(startDay, stored.getVisitFrequencyMonths());

        stored.setStatus(STATUS_ACTIVE);
        stored.setConfigurationStartDate(startDay);
        stored.setConfigurationEndDate(end);
        AuditDetails cfgAudit = stored.getAuditDetails() == null ? audit : AuditDetails.builder()
                .createdBy(stored.getAuditDetails().getCreatedBy())
                .createdTime(stored.getAuditDetails().getCreatedTime())
                .lastModifiedBy(audit.getLastModifiedBy())
                .lastModifiedTime(audit.getLastModifiedTime())
                .build();
        stored.setAuditDetails(cfgAudit);

        ScheduledVisit visit = firstVisit(stored, firstDue, audit);
        AssetAmc link = AssetAmc.builder()
                .id(AmcSchedule.assetAmcId(stored.getId(), assetId))
                .tenantId(stored.getTenantId())
                .assetId(assetId)
                .amcConfigurationId(stored.getId())
                .amcStartDate(startDay)
                .amcEndDate(end)
                .status(STATUS_ACTIVE)
                .isLegacyAsset(false)
                .auditDetails(audit)
                .build();
        return new ActivationPlan(stored, visit, link);
    }

    /** Visit 1 of an ACTIVE configuration, assigned to its one active field staff. */
    static ScheduledVisit firstVisit(AmcConfiguration cfg, long dueDay, AuditDetails audit) {
        String visitId = AmcSchedule.visitId(cfg.getId(), 1);
        List<ScheduledVisitAssignment> assignments = new ArrayList<>();
        if (cfg.getAssignments() != null) {
            for (AmcConfigurationAssignment a : cfg.getAssignments()) {
                if (a.isActive() && a.getAssignedUser() != null) {
                    assignments.add(ScheduledVisitAssignment.builder()
                            .id(AmcSchedule.visitAssignmentId(visitId, a.getAssignedUser()))
                            .tenantId(cfg.getTenantId())
                            .scheduledVisitId(visitId)
                            .assignedUser(a.getAssignedUser())
                            .isActive(true)
                            .auditDetails(audit)
                            .build());
                }
            }
        }
        return ScheduledVisit.builder()
                .id(visitId)
                .tenantId(cfg.getTenantId())
                .amcConfigurationId(cfg.getId())
                .projectId(cfg.getProjectId())
                .facilityId(cfg.getFacilityId())
                .visitNumber(1)
                .scheduledDate(dueDay)
                .lastVisitDate(null)
                .status("SCHEDULED")
                .isActive(true)
                .vendorId(cfg.getVendorId())
                .assignments(assignments)
                .auditDetails(audit)
                .build();
    }
}
