package org.egov.amc.livelihood;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.common.producer.Producer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LivelihoodNextVisitTest {

    AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
    AmcConfigurationRepository repo = mock(AmcConfigurationRepository.class);
    LivelihoodActivationService activation = mock(LivelihoodActivationService.class);
    SystemUserProvider sysUser = mock(SystemUserProvider.class);
    AmcConfigurationServiceUtil util = mock(AmcConfigurationServiceUtil.class);
    Producer producer = mock(Producer.class);
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    LivelihoodNextVisitService service;
    RequestInfo fs = RequestInfo.builder().userInfo(User.builder().uuid("fs-1").build()).build();

    @BeforeEach
    void setUp() {
        when(config.isLazyGenerationEnabled()).thenReturn(true);
        when(config.getSaveScheduledVisitTopic()).thenReturn("save-scheduled-visit");
        when(sysUser.requestInfo()).thenReturn(RequestInfo.builder().userInfo(User.builder().uuid("sys").build()).build());
        when(util.getAuditDetails(anyString(), any(), anyBoolean())).thenReturn(
                AuditDetails.builder().createdBy("fs-1").createdTime(5L).lastModifiedBy("fs-1").lastModifiedTime(5L).build());
        when(activation.scheduleIfNeeded(any(), any())).thenReturn(true);
        service = new LivelihoodNextVisitService(config, repo, activation, sysUser, util, producer, jdbc);
    }

    static AmcConfiguration active(int duration, int frequency) {
        AmcConfiguration c = AmcScheduleAndPlanTest.pendingConfig();
        c.setStatus("ACTIVE");
        c.setDurationMonths(duration);
        c.setVisitFrequencyMonths(frequency);
        return c;
    }

    @Test
    void nextDueIsTheFirstSubmissionDayPlusFrequency() {
        // submitted 20 Apr 2027 15:00 IST -> visit 2 due 20 Oct 2027
        assertEquals(AmcScheduleAndPlanTest.day(2027, 10, 20),
                LivelihoodNextVisitService.nextDueDay(AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0), 6));
        // month end: 31 Jan + 6 = 31 Jul; 31 Aug + 6 = 29 Feb (leap year)
        assertEquals(AmcScheduleAndPlanTest.day(2027, 7, 31), LivelihoodNextVisitService.nextDueDay(AmcScheduleAndPlanTest.ist(2027, 1, 31, 9, 0), 6));
        assertEquals(AmcScheduleAndPlanTest.day(2028, 2, 29), LivelihoodNextVisitService.nextDueDay(AmcScheduleAndPlanTest.ist(2027, 8, 31, 9, 0), 6));
        // 23:30 IST is still that IST day (18:00 UTC)
        assertEquals(AmcScheduleAndPlanTest.day(2027, 10, 20), LivelihoodNextVisitService.nextDueDay(AmcScheduleAndPlanTest.ist(2027, 4, 20, 23, 30), 6));
    }

    @Test
    void noVisitAfterTheLast() {
        assertEquals(2, LivelihoodNextVisitService.nextVisitNumber(active(12, 6), 1));
        assertNull(LivelihoodNextVisitService.nextVisitNumber(active(12, 6), 2));
        assertNull(LivelihoodNextVisitService.nextVisitNumber(active(12, 12), 1), "total = 1");
        assertEquals(3, LivelihoodNextVisitService.nextVisitNumber(active(36, 12), 2));
        assertNull(service.createAfter(active(12, 12), 1, 10L, fs));
        verifyNoInteractions(producer);
    }

    @Test
    @SuppressWarnings("unchecked")
    void createsVisitTwoWithFixedIdSameFieldStaffAndDueDate() {
        long first = AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0);
        ScheduledVisit v = service.createAfter(active(12, 6), 1, first, fs);

        assertEquals(AmcSchedule.visitId("cfg-1", 2), v.getId());
        assertEquals(2, v.getVisitNumber());
        assertEquals(AmcScheduleAndPlanTest.day(2027, 10, 20), v.getScheduledDate());
        assertEquals("SCHEDULED", v.getStatus());
        assertEquals("org-1", v.getVendorId());
        assertEquals(1, v.getAssignments().size());
        assertEquals("fs-1", v.getAssignments().get(0).getAssignedUser());
        ArgumentCaptor<Object> msg = ArgumentCaptor.forClass(Object.class);
        verify(producer).push(eq("save-scheduled-visit"), msg.capture());
        assertEquals(List.of(v), ((Map<String, Object>) msg.getValue()).get("ScheduledVisit"));
    }

    @Test
    void repeatWritesNothing() {
        when(activation.scheduleIfNeeded(any(), any())).thenReturn(false);
        assertNull(service.createAfter(active(12, 6), 1, 10L, fs));
        verifyNoInteractions(producer);
    }

    @Test
    void notActiveOrSwitchedOffCreatesNothing() {
        AmcConfiguration cancelled = active(12, 6);
        cancelled.setStatus("CANCELLED");
        assertNull(service.createAfter(cancelled, 1, 10L, fs));
        AmcConfiguration off = active(12, 6);
        off.setIsActive(false);
        assertNull(service.createAfter(off, 1, 10L, fs));
        when(config.isLazyGenerationEnabled()).thenReturn(false);
        assertNull(service.createAfter(active(12, 6), 1, 10L, fs));
        verifyNoInteractions(producer, activation);
    }

    @Test
    void missingVisitFinderConditions() {
        String q = LivelihoodNextVisitService.MISSING_NEXT_VISITS_SQL;
        assertTrue(q.contains("c.status = 'ACTIVE'") && q.contains("c.is_active"), "only running AMCs");
        assertTrue(q.contains("v.first_submission_date IS NOT NULL"), "only finally submitted visits");
        assertTrue(q.contains("v.visit_number < c.duration_months / c.visit_frequency_months"), "not after the last visit");
        assertTrue(q.contains("max(v2.visit_number)") && q.contains("v2.is_active"), "the highest live visit has no successor");
    }
}
