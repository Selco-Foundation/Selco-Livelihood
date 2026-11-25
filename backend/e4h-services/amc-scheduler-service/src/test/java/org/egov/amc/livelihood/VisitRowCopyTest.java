package org.egov.amc.livelihood;

import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.amc.web.models.VisitReport;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

class VisitRowCopyTest {

    /** Review A4: the object sent to update-scheduled-visit must carry every persisted column. */
    @Test
    void fullRowKeepsEveryPersistedColumn() {
        VisitReport report = VisitReport.builder().schemaCode("AMC_Report").build();
        Map<String, Object> additional = Map.of("reportPdf", Map.of("fileStoreId", "fs-1"),
                "systemStatus", Map.of("isSystemFunctional", false));
        List<ScheduledVisitAssignment> assignments = List.of(ScheduledVisitAssignment.builder().assignedUser("u1").build());
        ScheduledVisit loaded = ScheduledVisit.builder()
                .id("v1").tenantId("livelihood").projectId("p1").amcConfigurationId("c1")
                .facilityId("ED/2026/0027").facilityName("Priya").visitNumber(2)
                .scheduledDate(100L).actualVisitDate(90L).lastVisitDate(50L)
                .status("PENDING_APPROVAL").isActive(true)
                .visitReport(report).additionalDetails(additional).assignments(assignments)
                .vendorId("org-1").firstSubmissionDate(91L).latestSubmissionDate(95L).approvedBy("SYSTEM")
                .build();

        ScheduledVisit copy = VisitRowCopy.fullRow(loaded).build();

        assertEquals("v1", copy.getId());
        assertEquals("livelihood", copy.getTenantId());
        assertEquals("p1", copy.getProjectId());
        assertEquals("c1", copy.getAmcConfigurationId());
        assertEquals("ED/2026/0027", copy.getFacilityId());
        assertEquals("Priya", copy.getFacilityName());
        assertEquals(2, copy.getVisitNumber());
        assertEquals(100L, copy.getScheduledDate());
        assertEquals(90L, copy.getActualVisitDate());
        assertEquals(50L, copy.getLastVisitDate());
        assertEquals("PENDING_APPROVAL", copy.getStatus());
        assertEquals(true, copy.getIsActive());
        assertSame(report, copy.getVisitReport());
        assertSame(additional, copy.getAdditionalDetails());
        assertSame(assignments, copy.getAssignments());
        assertEquals("org-1", copy.getVendorId());
        assertEquals(91L, copy.getFirstSubmissionDate());
        assertEquals(95L, copy.getLatestSubmissionDate());
        assertEquals("SYSTEM", copy.getApprovedBy());
    }

    @Test
    void callerCanOverrideOneField() {
        ScheduledVisit loaded = ScheduledVisit.builder().id("v1").status("SCHEDULED").vendorId("org-1").build();

        ScheduledVisit copy = VisitRowCopy.fullRow(loaded).status("EXPIRED").build();

        assertEquals("EXPIRED", copy.getStatus());
        assertEquals("org-1", copy.getVendorId());
    }
}
