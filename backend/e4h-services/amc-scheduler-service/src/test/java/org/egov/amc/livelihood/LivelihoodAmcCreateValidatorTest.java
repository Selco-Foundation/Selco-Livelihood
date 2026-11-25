package org.egov.amc.livelihood;

import org.egov.amc.livelihood.AmcMdmsOptions.Options;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.Facts;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.livelihood.VendorOrgDirectory.OrgMember;
import org.egov.amc.livelihood.VendorOrgDirectory.VendorOrg;
import org.egov.amc.web.models.AmcConfiguration;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.egov.amc.livelihood.LivelihoodAmc.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LivelihoodAmcCreateValidatorTest {

    static final String T = "livelihood";
    static final String ORG = "org-vendor", PLATFORM = "org-platform", INACTIVE = "org-inactive";
    static final String FS = "fs-1", NO_ROLE = "fs-norole", LEFT = "fs-left";
    // 14 Nov 2026 16:30 IST
    static final long APPROVED_AT = LocalDateTime.of(2026, 11, 14, 16, 30).atZone(IST).toInstant().toEpochMilli();

    static Facts facts() {
        Map<String, InstallationRow> rows = new HashMap<>();
        rows.put("pending", new InstallationRow("pending", T, "ED/1", "proj-1", "fp-1", "SOLAR", "ASSIGNED_TO_FIELD_STAFF", 0));
        rows.put("approved", new InstallationRow("approved", T, "ED/2", "proj-1", "fp-1", "SOLAR", INSTALLATION_APPROVED, APPROVED_AT));
        rows.put("approved-nodate", new InstallationRow("approved-nodate", T, "ED/3", "proj-1", "fp-1", "SOLAR", INSTALLATION_APPROVED, 0));
        rows.put("machine", new InstallationRow("machine", T, "ED/4", "proj-1", "fp-1", "MACHINE", "ASSIGNED_TO_FIELD_STAFF", 0));
        rows.put("running", new InstallationRow("running", T, "ED/5", "proj-1", "fp-1", "SOLAR", "ASSIGNED_TO_FIELD_STAFF", 0));
        Map<String, VendorOrg> orgs = Map.of(ORG, new VendorOrg(ORG, "VENDOR", true),
                PLATFORM, new VendorOrg(PLATFORM, "PLATFORM", true), INACTIVE, new VendorOrg(INACTIVE, "VENDOR", false));
        Map<String, OrgMember> members = Map.of(
                VendorOrgDirectory.memberKey(ORG, FS), new OrgMember(ORG, FS, false, Set.of("EMPLOYEE", "AMC_FIELD_STAFF")),
                VendorOrgDirectory.memberKey(ORG, NO_ROLE), new OrgMember(ORG, NO_ROLE, false, Set.of("EMPLOYEE")),
                VendorOrgDirectory.memberKey(ORG, LEFT), new OrgMember(ORG, LEFT, true, Set.of("AMC_FIELD_STAFF")));
        return new Facts(T, rows, Set.of("running"), orgs, members, new Options(Set.of(6, 12), Set.of(1, 2, 3)));
    }

    static AmcConfiguration row(String af) {
        return AmcConfiguration.builder().tenantId(T).activityFacilityId(af).visitFrequencyMonths(6).durationMonths(12)
                .vendorOrgId(ORG).amcFieldStaffId(FS).build();
    }

    static List<String> codes(List<RowError> errors) {
        return errors.stream().map(RowError::code).toList();
    }

    static List<String> check(AmcConfiguration... rows) {
        return codes(LivelihoodAmcCreateValidator.validate(List.of(rows), facts()));
    }

    @Test
    void validPendingRowPasses() {
        assertTrue(check(row("pending")).isEmpty());
    }

    @Test
    void validApprovedRowWithStartOnApprovalDayPasses() {
        AmcConfiguration c = row("approved");
        c.setConfigurationStartDate(startOfIstDay(istDay(APPROVED_AT)));   // 14 Nov 00:00 IST, before the 16:30 approval
        assertTrue(check(c).isEmpty(), "same IST day counts as on/after the approval date");
    }

    @Test
    void installationRowRules() {
        assertEquals(List.of(AMC_INVALID_ACTIVITY_FACILITY), check(row(null)));
        assertEquals(List.of(AMC_INVALID_ACTIVITY_FACILITY), check(row("unknown")));
        assertEquals(List.of(AMC_INVALID_ACTIVITY_FACILITY), check(row("machine")));
        assertEquals(List.of(DUPLICATE_AMC_CONFIGURATION), check(row("running")));
        assertEquals(List.of(DUPLICATE_AMC_CONFIGURATION), check(row("pending"), row("pending")));
    }

    @Test
    void frequencyAndDurationMustBeMdmsOptions() {
        AmcConfiguration c = row("pending");
        c.setVisitFrequencyMonths(5);
        assertEquals(List.of(AMC_INVALID_FREQUENCY), check(c));
        c = row("pending");
        c.setVisitFrequencyMonths(null);
        assertEquals(List.of(AMC_INVALID_FREQUENCY), check(c));
        c = row("pending");
        c.setDurationMonths(18);   // not whole years
        assertEquals(List.of(AMC_INVALID_DURATION), check(c));
        c = row("pending");
        c.setDurationMonths(48);   // 4 years not an option
        assertEquals(List.of(AMC_INVALID_DURATION), check(c));
        c = row("pending");
        c.setDurationMonths(null);
        assertEquals(List.of(AMC_INVALID_DURATION), check(c));
        c = row("pending");
        c.setVisitFrequencyMonths(12);
        c.setDurationMonths(36);
        assertTrue(check(c).isEmpty());
    }

    @Test
    void durationMustHoldWholeVisits() {
        Facts f = facts();
        Facts odd = new Facts(f.tenantId(), f.rows(), f.runningActivityFacilityIds(), f.orgs(), f.members(),
                new Options(Set.of(5), Set.of(1)));
        AmcConfiguration c = row("pending");
        c.setVisitFrequencyMonths(5);
        assertEquals(List.of(AMC_INVALID_DURATION), codes(LivelihoodAmcCreateValidator.validate(List.of(c), odd)));
    }

    @Test
    void vendorOrgAndFieldStaffRules() {
        AmcConfiguration c = row("pending");
        c.setVendorOrgId(PLATFORM);
        assertEquals(List.of(AMC_INVALID_VENDOR_ORG), check(c));
        c.setVendorOrgId(INACTIVE);
        assertEquals(List.of(AMC_INVALID_VENDOR_ORG), check(c));
        c.setVendorOrgId(null);
        assertEquals(List.of(AMC_INVALID_VENDOR_ORG), check(c));
        c = row("pending");
        c.setAmcFieldStaffId("stranger");
        assertEquals(List.of(AMC_FIELD_STAFF_NOT_IN_ORG), check(c));
        c.setAmcFieldStaffId(LEFT);
        assertEquals(List.of(AMC_FIELD_STAFF_NOT_IN_ORG), check(c));
        c.setAmcFieldStaffId(NO_ROLE);
        assertEquals(List.of(AMC_FIELD_STAFF_ROLE_MISSING), check(c));
    }

    @Test
    void startDateRules() {
        AmcConfiguration pending = row("pending");
        pending.setConfigurationStartDate(APPROVED_AT);
        assertEquals(List.of(AMC_START_DATE_NOT_ALLOWED), check(pending));

        assertEquals(List.of(AMC_START_DATE_REQUIRED), check(row("approved")));

        AmcConfiguration early = row("approved");
        early.setConfigurationStartDate(startOfIstDay(istDay(APPROVED_AT)) - 60_000L);   // 13 Nov 23:59 IST
        assertEquals(List.of(AMC_START_BEFORE_INSTALLATION), check(early));

        AmcConfiguration noDate = row("approved-nodate");
        noDate.setConfigurationStartDate(APPROVED_AT);
        assertEquals(List.of(AMC_INSTALLATION_APPROVAL_DATE_MISSING), check(noDate));
    }

    @Test
    void wrongTenantAndEveryProblemReported() {
        AmcConfiguration c = row("pending");
        c.setTenantId("in");
        c.setVisitFrequencyMonths(5);
        c.setVendorOrgId(PLATFORM);
        List<String> codes = check(c);
        assertTrue(codes.containsAll(List.of(AMC_INVALID_TENANT, AMC_INVALID_FREQUENCY, AMC_INVALID_VENDOR_ORG)));
    }

    @Test
    void errorsCarryRowIndexAndId() {
        List<RowError> errors = LivelihoodAmcCreateValidator.validate(List.of(row("pending"), row("machine")), facts());
        assertEquals(1, errors.size());
        assertEquals(1, errors.get(0).index());
        assertEquals("machine", errors.get(0).activityFacilityId());
    }
}
