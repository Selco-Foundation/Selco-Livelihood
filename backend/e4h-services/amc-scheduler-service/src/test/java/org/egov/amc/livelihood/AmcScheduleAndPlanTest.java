package org.egov.amc.livelihood;

import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.egov.amc.livelihood.LivelihoodAmc.IST;
import static org.egov.amc.livelihood.LivelihoodAmc.istDay;
import static org.egov.amc.livelihood.LivelihoodAmc.startOfIstDay;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AmcScheduleAndPlanTest {

    static long ist(int y, int m, int d, int h, int min) {
        return LocalDateTime.of(y, m, d, h, min).atZone(IST).toInstant().toEpochMilli();
    }

    static long day(int y, int m, int d) {
        return startOfIstDay(LocalDate.of(y, m, d));
    }

    @Test
    void startIsMidnightIstOfTheApprovalDay() {
        assertEquals(day(2026, 11, 14), AmcSchedule.startOfDay(ist(2026, 11, 14, 16, 30)));
        // 23:30 UTC on 13 Nov is already 14 Nov in IST
        assertEquals(day(2026, 11, 14), AmcSchedule.startOfDay(LocalDateTime.of(2026, 11, 13, 23, 30)
                .atZone(java.time.ZoneOffset.UTC).toInstant().toEpochMilli()));
    }

    @Test
    void monthsKeepTheDayOrClampToMonthEnd() {
        assertEquals(day(2027, 5, 14), AmcSchedule.plusMonths(day(2026, 11, 14), 6));
        assertEquals(day(2027, 2, 28), AmcSchedule.plusMonths(day(2027, 1, 31), 1));
        assertEquals(day(2028, 2, 29), AmcSchedule.plusMonths(day(2027, 8, 31), 6));
        assertEquals(day(2027, 7, 31), AmcSchedule.plusMonths(day(2027, 1, 31), 6));
        assertEquals(2, AmcSchedule.totalVisits(12, 6));
        assertEquals(3, AmcSchedule.totalVisits(36, 12));
    }

    @Test
    void idsAreStableAndDistinct() {
        assertEquals(AmcSchedule.visitId("cfg", 1), AmcSchedule.visitId("cfg", 1));
        assertNotEquals(AmcSchedule.visitId("cfg", 1), AmcSchedule.visitId("cfg", 2));
        assertNotEquals(AmcSchedule.visitId("cfg", 1), AmcSchedule.visitId("cfg2", 1));
        assertEquals(AmcSchedule.assetAmcId("cfg", "Ast/1"), AmcSchedule.assetAmcId("cfg", "Ast/1"));
        assertNotEquals(AmcSchedule.visitAssignmentId("v", "u1"), AmcSchedule.visitAssignmentId("v", "u2"));
    }

    static AmcConfiguration pendingConfig() {
        AmcConfigurationAssignment active = AmcConfigurationAssignment.builder().id("a1").assignedUser("fs-1").isActive(true).build();
        AmcConfigurationAssignment old = AmcConfigurationAssignment.builder().id("a0").assignedUser("fs-0").isActive(false).build();
        return AmcConfiguration.builder().id("cfg-1").tenantId("livelihood").activityFacilityId("row-1")
                .facilityId("ED/2026/0039").projectId("proj-1").vendorId("org-1")
                .assetTypes(List.of(Map.of("code", "SOLAR", "name", "Solar")))
                .durationMonths(12).visitFrequencyMonths(6).status("PENDING_ACTIVATION").isActive(true)
                .assignments(List.of(old, active))
                .auditDetails(AuditDetails.builder().createdBy("pm").createdTime(1L).lastModifiedBy("pm").lastModifiedTime(1L).build())
                .build();
    }

    @Test
    void activationPlanMakesConfigActiveWithVisitOneAndAssetLink() {
        AuditDetails now = AuditDetails.builder().createdBy("qc").createdTime(99L).lastModifiedBy("qc").lastModifiedTime(99L).build();
        long start = day(2026, 11, 14);

        ActivationPlan p = ActivationPlan.of(pendingConfig(), start, "Ast/2026/0150", now);

        AmcConfiguration c = p.configuration();
        assertEquals("ACTIVE", c.getStatus());
        assertEquals(start, c.getConfigurationStartDate());
        assertEquals(day(2027, 11, 14), c.getConfigurationEndDate());
        assertEquals("pm", c.getAuditDetails().getCreatedBy(), "created audit kept");
        assertEquals("qc", c.getAuditDetails().getLastModifiedBy());

        ScheduledVisit v = p.firstVisit();
        assertEquals(AmcSchedule.visitId("cfg-1", 1), v.getId());
        assertEquals(1, v.getVisitNumber());
        assertEquals(day(2027, 5, 14), v.getScheduledDate());
        assertEquals(LocalDate.of(2027, 5, 14), istDay(v.getScheduledDate()));
        assertEquals("SCHEDULED", v.getStatus());
        assertEquals(true, v.getIsActive());
        assertEquals("org-1", v.getVendorId());
        assertEquals("proj-1", v.getProjectId());
        assertEquals("ED/2026/0039", v.getFacilityId());
        assertNull(v.getLastVisitDate());
        assertEquals(1, v.getAssignments().size(), "only the active field staff");
        assertEquals("fs-1", v.getAssignments().get(0).getAssignedUser());
        assertTrue(v.getAssignments().get(0).isActive());
        assertEquals(AmcSchedule.visitAssignmentId(v.getId(), "fs-1"), v.getAssignments().get(0).getId());

        assertEquals(AmcSchedule.assetAmcId("cfg-1", "Ast/2026/0150"), p.assetAmc().getId());
        assertEquals("Ast/2026/0150", p.assetAmc().getAssetId());
        assertEquals("ACTIVE", p.assetAmc().getStatus());
        assertEquals(start, p.assetAmc().getAmcStartDate());
        assertEquals(c.getConfigurationEndDate(), p.assetAmc().getAmcEndDate());
    }

    @Test
    void sameInputGivesSameIds() {
        AuditDetails now = AuditDetails.builder().createdBy("x").createdTime(1L).lastModifiedBy("x").lastModifiedTime(1L).build();
        ActivationPlan a = ActivationPlan.of(pendingConfig(), day(2026, 11, 14), "Ast/1", now);
        ActivationPlan b = ActivationPlan.of(pendingConfig(), day(2026, 11, 14), "Ast/1", now);
        assertEquals(a.firstVisit().getId(), b.firstVisit().getId());
        assertEquals(a.assetAmc().getId(), b.assetAmc().getId());
    }
}
