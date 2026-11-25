package org.egov.amc.livelihood;

import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LivelihoodAmcCreateServiceTest {

    @Test
    void buildsPendingConfigurationFromTheInstallationRow() {
        AmcConfiguration in = AmcConfiguration.builder().tenantId("livelihood").activityFacilityId("6799")
                .visitFrequencyMonths(6).durationMonths(12).vendorOrgId(" org-1 ").amcFieldStaffId("fs-1")
                // ignored: set by the server
                .facilityId("spoofed").projectId("spoofed").status("ACTIVE").configurationStartDate(5L).build();
        InstallationRow row = new InstallationRow("6799", "livelihood", "ED/2026/0039", "proj-8d46", "fp2",
                "SOLAR", "SUBMITTED_BY_FIELD_STAFF", 0);

        AmcConfiguration out = LivelihoodAmcCreateService.buildPending(in, row, "livelihood");

        assertEquals("6799", out.getActivityFacilityId());
        assertEquals("ED/2026/0039", out.getFacilityId());
        assertEquals("proj-8d46", out.getProjectId());
        assertEquals("org-1", out.getVendorId());
        assertEquals("PENDING_ACTIVATION", out.getStatus());
        assertNull(out.getConfigurationStartDate());
        assertNull(out.getConfigurationEndDate());
        assertEquals(List.of(Map.of("code", "SOLAR", "name", "Solar")), out.getAssetTypes());
        assertEquals(1, out.getAssignments().size());
        assertEquals("fs-1", out.getAssignments().get(0).getAssignedUser());
        assertTrue(out.getAssignments().get(0).isActive());
        assertEquals(6, out.getVisitFrequencyMonths());
        assertEquals(12, out.getDurationMonths());
    }

    @Test
    void errorsGroupedByCodeWithEveryRow() {
        CustomException e = LivelihoodAmcCreateService.toException(List.of(
                new RowError(0, "a", "vendorOrgId", "AMC_INVALID_VENDOR_ORG", "bad org"),
                new RowError(2, "c", "vendorOrgId", "AMC_INVALID_VENDOR_ORG", "bad org"),
                new RowError(1, null, "activityFacilityId", "AMC_INVALID_ACTIVITY_FACILITY", "required")));
        Map<String, String> errors = e.getErrors();
        assertEquals(2, errors.size());
        assertTrue(errors.get("AMC_INVALID_VENDOR_ORG").contains("row 1 (a)"));
        assertTrue(errors.get("AMC_INVALID_VENDOR_ORG").contains("row 3 (c)"));
        assertTrue(errors.get("AMC_INVALID_ACTIVITY_FACILITY").startsWith("row 2, activityFacilityId"));
    }
}
