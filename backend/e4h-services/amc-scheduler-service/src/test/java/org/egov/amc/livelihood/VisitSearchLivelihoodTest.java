package org.egov.amc.livelihood;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.querybuilder.ScheduledVisitQueryBuilder;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.amc.web.models.ScheduledVisitSearchCriteria;
import org.egov.amc.web.models.ScheduledVisitSearchRequest;
import org.egov.common.models.core.URLParams;
import org.egov.amc.web.models.User;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.egov.amc.livelihood.AmcScheduleAndPlanTest.day;
import static org.egov.amc.livelihood.AmcScheduleAndPlanTest.ist;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VisitSearchLivelihoodTest {

    // ---- SLA --------------------------------------------------------------------------------------

    @Test
    void slaFromTheLatestSubmissionInIstDays() {
        long submitted = ist(2027, 3, 10, 18, 0);   // Wed 10 March 2027
        VisitReadFields.Sla on10 = VisitReadFields.sla("PENDING_APPROVAL", submitted, 7, ist(2027, 3, 10, 20, 0));
        assertEquals(day(2027, 3, 17), on10.dueDate());
        assertEquals(7, on10.daysRemaining());
        assertFalse(on10.breached());
        VisitReadFields.Sla on16 = VisitReadFields.sla("PENDING_APPROVAL", submitted, 7, ist(2027, 3, 16, 23, 59));
        assertEquals(1, on16.daysRemaining());
        assertFalse(on16.breached());
        VisitReadFields.Sla on17 = VisitReadFields.sla("PENDING_APPROVAL", submitted, 7, ist(2027, 3, 17, 0, 1));
        assertEquals(0, on17.daysRemaining());
        assertTrue(on17.breached());
        assertEquals(-1, VisitReadFields.sla("PENDING_APPROVAL", submitted, 7, ist(2027, 3, 18, 9, 0)).daysRemaining());
        assertNull(VisitReadFields.sla("APPROVED", submitted, 7, ist(2027, 3, 18, 9, 0)), "only PENDING_APPROVAL");
        assertNull(VisitReadFields.sla("PENDING_APPROVAL", null, 7, 1L));
    }

    @Test
    void slaFilterCutoffMatchesTheResponseRule() {
        // on 17 March the cutoff is 11 March 00:00: a report from the 10th is breached; on the 16th it is the 10th: not
        assertEquals(day(2027, 3, 11), VisitReadFields.slaCutoff(7, ist(2027, 3, 17, 10, 0)));
        assertEquals(day(2027, 3, 10), VisitReadFields.slaCutoff(7, ist(2027, 3, 16, 10, 0)));
        long submitted = ist(2027, 3, 10, 18, 0);
        assertTrue(submitted < VisitReadFields.slaCutoff(7, ist(2027, 3, 17, 10, 0)));
        assertFalse(submitted < VisitReadFields.slaCutoff(7, ist(2027, 3, 16, 10, 0)));
        assertEquals(day(2027, 3, 18), VisitReadFields.slaCutoff(0, ist(2027, 3, 17, 10, 0)), "0 days: everything pending is breached");
    }

    @Test
    void phoneNormalisation() {
        assertEquals("9678335201", VisitReadFields.normalisePhone("9678335201"));
        assertEquals("9678335201", VisitReadFields.normalisePhone("+91 96783 35201"));
        assertEquals("9678335201", VisitReadFields.normalisePhone("919678335201"));
        assertEquals("9678335201", VisitReadFields.normalisePhone("09678-335201"));
        assertNull(VisitReadFields.normalisePhone("96783"), "partial numbers are not a phone");
        assertNull(VisitReadFields.normalisePhone("Nipe Brahma"));
        assertNull(VisitReadFields.normalisePhone("1234567890"), "Indian mobiles start with 6-9");
    }

    @Test
    void computedFields() {
        ScheduledVisit v = ScheduledVisit.builder().status("SCHEDULED").scheduledDate(day(2027, 5, 16))
                .amcConfiguration(LivelihoodNextVisitTest.active(24, 6))
                .assignments(List.of(ScheduledVisitAssignment.builder().assignedUser("old").isActive(false).build(),
                        ScheduledVisitAssignment.builder().assignedUser("fs-1").isActive(true)
                                .user(User.builder().name("AMC Field Staff").mobileNumber("1000000917").build()).build()))
                .build();
        v.getAmcConfiguration().setActivityFacilityId("row-1");
        VisitReadFields.fill(v, new VisitReadFields.LivelihoodVisitDays(7, 30), ist(2027, 4, 1, 10, 0));
        assertEquals(4, v.getTotalVisits());
        assertEquals(day(2027, 4, 16), v.getSubmissionWindowOpensAt());
        assertEquals("row-1", v.getActivityFacilityId());
        assertEquals(Map.of("uuid", "fs-1", "name", "AMC Field Staff", "mobile", "1000000917"), v.getFieldStaff());
        assertNull(v.getSlaDueDate());
    }

    // ---- query builder --------------------------------------------------------------------------------

    static ScheduledVisitQueryBuilder builder(boolean livelihood) {
        AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
        when(config.getSearchSeeAllRoles()).thenReturn(List.of("PROJECT_MANAGER", "AMC_REVIEWER", "SYSTEM_USER"));
        when(config.isLivelihoodScheduleEnabled()).thenReturn(livelihood);
        when(config.getDefaultLimit()).thenReturn(10);
        when(config.getMaxLimit()).thenReturn(100);
        return new ScheduledVisitQueryBuilder(config);
    }

    static String query(ScheduledVisitQueryBuilder b, ScheduledVisitSearchCriteria c, List<Object> params) {
        RequestInfo ri = RequestInfo.builder().userInfo(org.egov.common.contract.request.User.builder().uuid("rv")
                .roles(List.of(Role.builder().code("AMC_REVIEWER").tenantId("livelihood").build())).build()).build();
        c.setTenantId("livelihood");
        return b.getScheduledVisitSearchQuery(ScheduledVisitSearchRequest.builder().RequestInfo(ri).searchCriteria(c).build(),
                URLParams.builder().tenantId("livelihood").limit(10).offset(0).build(), params);
    }

    @Test
    void livelihoodCriteria() {
        ScheduledVisitSearchCriteria c = ScheduledVisitSearchCriteria.builder().approvedBy("system").slaBreached(true).slaCutoff(111L)
                .latestSubmissionFrom(5L).latestSubmissionTo(9L).searchText("Nipe").searchPhoneCipher("691872|abc")
                .activityFacilityIds(List.of("row-1")).vendorIds(List.of("org-1")).build();
        List<Object> params = new ArrayList<>();
        String q = query(builder(true), c, params);
        assertTrue(q.contains("sv.approved_by = ?") && params.contains("SYSTEM"));
        assertTrue(q.contains("(sv.status = 'PENDING_APPROVAL' AND sv.latest_submission_date < ?)") && params.contains(111L));
        assertTrue(q.contains("sv.latest_submission_date >= ?") && q.contains("sv.latest_submission_date <= ?"));
        assertTrue(q.contains("COALESCE(sv.facility_name, f.facility_name) ILIKE ?") && params.contains("%Nipe%"));
        assertTrue(q.contains("OR f.facility_poc_phone = ?") && params.contains("691872|abc"), "exact encrypted phone");
        assertTrue(q.contains("ac.activity_facility_id IN ("));
        assertTrue(q.contains("sv.vendor_id IN ("), "the org that did the visit (review A16)");
        assertTrue(q.contains("sv_next.is_active"));
        assertTrue(q.contains("ac.activity_facility_id AS amc_activity_facility_id"));

        ScheduledVisitSearchCriteria notBreached = ScheduledVisitSearchCriteria.builder().slaBreached(false).slaCutoff(111L).build();
        assertTrue(query(builder(true), notBreached, new ArrayList<>()).contains("sv.latest_submission_date >= ?)"));
    }

    @Test
    void e4hIgnoresTheLivelihoodCriteria() {
        ScheduledVisitSearchCriteria c = ScheduledVisitSearchCriteria.builder().approvedBy("SYSTEM").vendorIds(List.of("org-1")).build();
        String q = query(builder(false), c, new ArrayList<>());
        assertFalse(q.contains("sv.approved_by = ?"));
        assertTrue(q.contains("ac.vendor_id IN ("));
    }

    @Test
    void sortOrder() {
        assertEquals("sv_scheduled_date ASC NULLS LAST, sv_visit_id", ScheduledVisitQueryBuilder.livelihoodOrder(
                ScheduledVisitSearchCriteria.builder().statuses(List.of("SCHEDULED")).build()), "New Report: soonest due first");
        assertEquals("sv_last_modified_time DESC NULLS LAST, sv_visit_id", ScheduledVisitQueryBuilder.livelihoodOrder(
                ScheduledVisitSearchCriteria.builder().statuses(List.of("REJECTED")).build()), "Inbox: newest action first");
        assertEquals("sv_latest_submission_date ASC NULLS LAST, sv_visit_id", ScheduledVisitQueryBuilder.livelihoodOrder(
                ScheduledVisitSearchCriteria.builder().statuses(List.of("PENDING_APPROVAL")).sortBy("latestSubmissionDate").build()));
        assertEquals("sv_scheduled_date DESC NULLS LAST, sv_visit_id", ScheduledVisitQueryBuilder.livelihoodOrder(
                ScheduledVisitSearchCriteria.builder().statuses(List.of("SCHEDULED")).sortDirection("desc").build()), "sort_direction honoured");
        String q = query(builder(true), ScheduledVisitSearchCriteria.builder().statuses(List.of("SCHEDULED")).build(), new ArrayList<>());
        assertTrue(q.contains("ORDER BY sv_scheduled_date ASC") && q.contains("ORDER BY offset_"));
    }
}
