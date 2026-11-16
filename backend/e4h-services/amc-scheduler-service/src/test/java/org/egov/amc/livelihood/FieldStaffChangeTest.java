package org.egov.amc.livelihood;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.FieldStaffChangePlanner.RowPlan;
import org.egov.amc.livelihood.FieldStaffChangePlanner.Update;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.livelihood.VendorOrgDirectory.OrgMember;
import org.egov.amc.livelihood.VendorOrgDirectory.VendorOrg;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.repository.ScheduledVisitRepository;
import org.egov.amc.service.VisitWorkflowService;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.amc.web.models.VisitReport;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.common.contract.workflow.State;
import org.egov.common.producer.Producer;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FieldStaffChangeTest {

    static final AuditDetails AUDIT = AuditDetails.builder().createdBy("pm").createdTime(9L).lastModifiedBy("pm").lastModifiedTime(9L).build();
    static final String ORG_X = "org-1", ORG_Y = "org-2";

    static AmcConfiguration cfg() {
        AmcConfiguration c = AmcScheduleAndPlanTest.pendingConfig();   // org-1, active fs-1, inactive fs-0
        c.setStatus("ACTIVE");
        return c;
    }

    static ScheduledVisit visit(int n, String status, Long first, String org, String user) {
        String id = "v" + n;
        List<ScheduledVisitAssignment> as = new ArrayList<>();
        as.add(ScheduledVisitAssignment.builder().id(AmcSchedule.visitAssignmentId(id, user)).scheduledVisitId(id).assignedUser(user).isActive(true).build());
        Map<String, Object> details = new HashMap<>(Map.of("systemStatus", Map.of("isSystemInUse", true), "reportPdf", Map.of("fileStoreId", "p"), "keep", 1));
        return ScheduledVisit.builder().id(id).tenantId("livelihood").amcConfigurationId("cfg-1").visitNumber(n).status(status)
                .firstSubmissionDate(first).vendorId(org).assignments(as).additionalDetails(details)
                .visitReport(VisitReport.builder().responses(Map.of("a", 1)).build()).actualVisitDate(5L).build();
    }

    static Update to(String user) {
        return new Update("livelihood", "row-1", null, user, null);
    }

    static Update toOrg(String org, String user) {
        return new Update("livelihood", "row-1", org, user, null);
    }

    static String active(ScheduledVisit v) {
        return FieldStaffChangePlanner.activeVisitAssignee(v);
    }

    // ---- the §6.6 table -------------------------------------------------------------------------------

    @Test
    void sameOrgScheduledMovesToTheNewPerson() {
        ScheduledVisit v = visit(1, "SCHEDULED", null, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(to("fs-2"), cfg(), List.of(v), AUDIT);
        assertEquals(List.of(v), p.visitUpdates());
        assertEquals("fs-2", active(v));
        assertEquals(2, v.getAssignments().size(), "old row kept, inactive");
        assertEquals(ORG_X, v.getVendorId());
        assertTrue(p.resets().isEmpty());
        assertEquals("fs-2", LivelihoodAmcEditPlanner.activeFieldStaff(p.configuration()));
    }

    @Test
    void orgChangeScheduledAlsoSetsTheVendor() {
        ScheduledVisit v = visit(1, "SCHEDULED", null, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(toOrg(ORG_Y, "fs-9"), cfg(), List.of(v), AUDIT);
        assertEquals(ORG_Y, v.getVendorId());
        assertEquals(ORG_Y, p.configuration().getVendorId());
        assertEquals("fs-9", active(v));
        assertTrue(p.resets().isEmpty());
    }

    @Test
    void sameOrgCodePendingKeepsTheReport() {
        ScheduledVisit v = visit(1, "PENDING_OTP_APPROVAL", null, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(to("fs-2"), cfg(), List.of(v), AUDIT);
        assertTrue(p.resets().isEmpty());
        assertEquals("PENDING_OTP_APPROVAL", v.getStatus());
        assertEquals(Map.of("a", 1), v.getVisitReport().getResponses());
        assertEquals("fs-2", active(v));
    }

    @Test
    void orgChangeCodePendingResetsAndClears() {
        ScheduledVisit v = visit(1, "PENDING_OTP_APPROVAL", null, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(toOrg(ORG_Y, "fs-9"), cfg(), List.of(v), AUDIT);
        assertEquals(List.of(v), p.resets());
        assertEquals("SCHEDULED", v.getStatus());
        assertNull(v.getVisitReport());
        assertNull(v.getActualVisitDate());
        assertFalse(v.getAdditionalDetails().containsKey("systemStatus"));
        assertFalse(v.getAdditionalDetails().containsKey("reportPdf"));
        assertEquals(1, v.getAdditionalDetails().get("keep"));
        assertEquals(ORG_Y, v.getVendorId());
        assertEquals("fs-9", active(v));
    }

    @Test
    void reworkMovesWithinTheOrgButStaysOnAnOrgChange() {
        ScheduledVisit same = visit(2, "REJECTED", 7L, ORG_X, "fs-1");
        FieldStaffChangePlanner.plan(to("fs-2"), cfg(), List.of(same), AUDIT);
        assertEquals("fs-2", active(same));

        ScheduledVisit other = visit(2, "REJECTED", 7L, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(toOrg(ORG_Y, "fs-9"), cfg(), List.of(other), AUDIT);
        assertEquals("fs-1", active(other), "stays with the original vendor and person");
        assertEquals(ORG_X, other.getVendorId());
        assertTrue(p.visitUpdates().isEmpty());
    }

    @Test
    void inReviewAndApprovedVisitsNeverChange() {
        ScheduledVisit review = visit(1, "PENDING_APPROVAL", 7L, ORG_X, "fs-1");
        ScheduledVisit approved = visit(2, "APPROVED", 8L, ORG_X, "fs-1");
        RowPlan p = FieldStaffChangePlanner.plan(toOrg(ORG_Y, "fs-9"), cfg(), List.of(review, approved), AUDIT);
        assertTrue(p.visitUpdates().isEmpty());
        assertEquals("fs-1", active(review));
        assertEquals("fs-1", active(approved));
        assertEquals(ORG_Y, p.configuration().getVendorId());
    }

    @Test
    void pendingAmcChangesTheConfigurationOnly() {
        AmcConfiguration pending = AmcScheduleAndPlanTest.pendingConfig();
        RowPlan p = FieldStaffChangePlanner.plan(to("fs-2"), pending, List.of(), AUDIT);
        assertEquals("fs-2", LivelihoodAmcEditPlanner.activeFieldStaff(p.configuration()));
        assertTrue(p.visitUpdates().isEmpty());
    }

    @Test
    void nothingChangedIsReportedUnchanged() {
        assertTrue(FieldStaffChangePlanner.plan(to("fs-1"), cfg(), List.of(visit(1, "SCHEDULED", null, ORG_X, "fs-1")), AUDIT).unchanged());
    }

    @Test
    void backToAnEarlierPersonReactivatesTheirOldRow() {
        AmcConfiguration c = cfg();   // fs-0 held it before (inactive row a0), fs-1 now (a1)
        RowPlan p = FieldStaffChangePlanner.plan(to("fs-0"), c, List.of(), AUDIT);
        List<AmcConfigurationAssignment> as = p.configuration().getAssignments();
        assertEquals(2, as.size(), "no new row: the unique index (config, user) ignores is_active");
        AmcConfigurationAssignment back = as.stream().filter(a -> "fs-0".equals(a.getAssignedUser())).findFirst().orElseThrow();
        assertEquals("a0", back.getId(), "same id reused");
        assertTrue(back.isActive());
        assertFalse(as.stream().filter(a -> "fs-1".equals(a.getAssignedUser())).findFirst().orElseThrow().isActive());

        AmcConfiguration fresh = cfg();
        RowPlan q = FieldStaffChangePlanner.plan(to("fs-new"), fresh, List.of(), AUDIT);
        AmcConfigurationAssignment added = q.configuration().getAssignments().get(2);
        assertEquals(FieldStaffChangePlanner.configAssignmentId("cfg-1", "fs-new"), added.getId(), "fixed id: a retry inserts nothing new");
    }

    @Test
    void reworkLeftWithAnEarlierOrgGoesToANamedPersonOfThatOrg() {
        AmcConfiguration c = cfg();
        c.setVendorId(ORG_Y);   // AMC already moved to org Y
        ScheduledVisit left = visit(3, "REJECTED", 7L, ORG_X, "ramesh");
        RowPlan p = FieldStaffChangePlanner.plan(new Update("livelihood", "row-1", null, "fs-1", "kiran"), c, List.of(left), AUDIT);
        assertFalse(p.unchanged());
        assertEquals("kiran", active(left));
        assertEquals(ORG_X, left.getVendorId(), "org, report and status stay");
        assertEquals("REJECTED", left.getStatus());
    }

    // ---- checks -----------------------------------------------------------------------------------------

    static Map<String, OrgMember> members(String... orgUserRole) {
        Map<String, OrgMember> m = new HashMap<>();
        for (int i = 0; i < orgUserRole.length; i += 3) {
            m.put(VendorOrgDirectory.memberKey(orgUserRole[i], orgUserRole[i + 1]),
                    new OrgMember(orgUserRole[i], orgUserRole[i + 1], false, Set.of(orgUserRole[i + 2])));
        }
        return m;
    }

    static List<String> codes(List<RowError> e) {
        return e.stream().map(RowError::code).toList();
    }

    @Test
    void checks() {
        Map<String, VendorOrg> orgs = Map.of(ORG_Y, new VendorOrg(ORG_Y, "VENDOR", true), "plat", new VendorOrg("plat", "PLATFORM", true));
        Map<String, OrgMember> m = members(ORG_X, "fs-2", "AMC_FIELD_STAFF", ORG_Y, "fs-9", "AMC_FIELD_STAFF", ORG_X, "clerk", "EMPLOYEE");
        assertTrue(FieldStaffChangePlanner.check(0, to("fs-2"), cfg(), false, List.of(), orgs, m, new HashSet<>()).isEmpty());
        assertEquals(List.of("AMC_NOT_FOUND"), codes(FieldStaffChangePlanner.check(0, to("fs-2"), null, false, List.of(), orgs, m, new HashSet<>())));
        assertEquals(List.of("AMC_COMPLETED"), codes(FieldStaffChangePlanner.check(0, to("fs-2"), null, true, List.of(), orgs, m, new HashSet<>())));
        assertEquals(List.of("AMC_INVALID_VENDOR_ORG"), codes(FieldStaffChangePlanner.check(0, toOrg("plat", "fs-9"), cfg(), false, List.of(), orgs, m, new HashSet<>())));
        assertEquals(List.of("AMC_FIELD_STAFF_NOT_IN_ORG"), codes(FieldStaffChangePlanner.check(0, toOrg(ORG_Y, "fs-2"), cfg(), false, List.of(), orgs, m, new HashSet<>())),
                "fs-2 is in org X, the AMC moves to org Y");
        assertEquals(List.of("AMC_FIELD_STAFF_ROLE_MISSING"), codes(FieldStaffChangePlanner.check(0, to("clerk"), cfg(), false, List.of(), orgs, m, new HashSet<>())));
        Set<String> seen = new HashSet<>();
        FieldStaffChangePlanner.check(0, to("fs-2"), cfg(), false, List.of(), orgs, m, seen);
        assertEquals(List.of("DUPLICATE_ACTIVITY_FACILITY"), codes(FieldStaffChangePlanner.check(1, to("fs-2"), cfg(), false, List.of(), orgs, m, seen)));
        assertEquals(List.of("AMC_NO_REJECTED_VISIT_TO_MOVE"), codes(FieldStaffChangePlanner.check(0,
                new Update("livelihood", "row-1", null, "fs-2", "fs-2"), cfg(), false, List.of(visit(1, "REJECTED", 7L, ORG_X, "fs-1")), orgs, m, new HashSet<>())),
                "the rejected visit is with the AMC's own org");
    }

    // ---- half-done reset ---------------------------------------------------------------------------------

    @Test
    void aRetryAfterAHalfDoneResetDoesNotResetAgain() {
        AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
        AmcConfigurationRepository cfgRepo = mock(AmcConfigurationRepository.class);
        ScheduledVisitRepository visitRepo = mock(ScheduledVisitRepository.class);
        VendorOrgDirectory vendors = mock(VendorOrgDirectory.class);
        VisitWorkflowService wf = mock(VisitWorkflowService.class);
        SystemUserProvider sys = mock(SystemUserProvider.class);
        AmcConfigurationServiceUtil util = mock(AmcConfigurationServiceUtil.class);
        Producer producer = mock(Producer.class);
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        AmcConfiguration c = cfg();
        when(cfgRepo.getAmcConfiguration(any(), any(), any(), anyString(), any(), any())).thenReturn(List.of(c));
        when(visitRepo.getScheduledVisit(any(), any(), any(), anyString(), any(), any()))
                .thenReturn(List.of(visit(1, "PENDING_OTP_APPROVAL", null, ORG_X, "fs-1")));
        when(vendors.findOrgs(any(), anyString(), any())).thenReturn(Map.of(ORG_Y, new VendorOrg(ORG_Y, "VENDOR", true)));
        when(vendors.findMembers(any(), any(), anyString(), any())).thenReturn(members(ORG_Y, "fs-9", "AMC_FIELD_STAFF"));
        when(sys.requestInfo()).thenReturn(RequestInfo.builder().userInfo(User.builder().uuid("sys").build()).build());
        when(util.getAuditDetails(anyString(), any(), anyBoolean())).thenReturn(AUDIT);
        when(config.getUpdateAmcConfigurationTopic()).thenReturn("update-amc-configuration");
        when(config.getUpdateScheduledVisitTopic()).thenReturn("update-scheduled-visit");
        ProcessInstance scheduled = new ProcessInstance();
        scheduled.setState(State.builder().state("SCHEDULED").build());
        when(wf.getProcessInstanceById(eq("v1"), anyString(), any())).thenReturn(List.of(scheduled));
        FieldStaffChangeService service = new FieldStaffChangeService(config, cfgRepo, visitRepo, vendors, wf, sys, util, producer, jdbc);
        RequestInfo pm = RequestInfo.builder().userInfo(User.builder().uuid("pm").build()).build();

        List<Map<String, Object>> out = service.change(List.of(new Update("livelihood", "row-1", ORG_Y, "fs-9", null)), pm);

        assertEquals("CHANGED", out.get(0).get("outcome"));
        verify(wf, never()).transitionWorkflow(any(), anyString(), any(), any(), anyString());
        verify(producer).push(eq("update-scheduled-visit"), any());
        verify(jdbc).update(FieldStaffChangeService.CLEAR_NON_FUNCTIONAL_SQL, "v1");
    }
}
