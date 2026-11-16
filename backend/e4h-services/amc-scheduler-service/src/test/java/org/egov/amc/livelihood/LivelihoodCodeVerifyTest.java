package org.egov.amc.livelihood;

import org.egov.amc.web.models.Otp;
import org.egov.amc.web.models.OtpResponse;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.workflow.State;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LivelihoodCodeVerifyTest {

    static final String FS = LivelihoodVisitSubmitTest.FS;
    static final long NOW = AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0);

    static ScheduledVisit waiting() {
        ScheduledVisit v = LivelihoodVisitSubmitTest.visit("PENDING_OTP_APPROVAL");
        v.setVisitNumber(1);
        v.setAmcConfigurationId("cfg-1");
        return v;
    }

    LivelihoodCodeVerify.Steps steps(boolean valid) {
        LivelihoodCodeVerify.Steps s = mock(LivelihoodCodeVerify.Steps.class);
        when(s.codeIsValid(anyString(), anyString())).thenReturn(valid);
        ProcessInstance pi = new ProcessInstance();
        pi.setState(State.builder().state("PENDING_APPROVAL").build());
        when(s.transition(anyString(), any())).thenReturn(pi);
        return s;
    }

    @Test
    void rightCodeRunsInOrderAndCreatesTheNextVisitOnce() {
        LivelihoodCodeVerify.Steps s = steps(true);
        ScheduledVisit v = LivelihoodCodeVerify.run(waiting(), FS, " 1234 ", NOW, s);

        InOrder o = inOrder(s);
        o.verify(s).codeIsValid("9678335201", "1234");
        o.verify(s).transition("SUBMIT_OTP", null);
        o.verify(s).save(any(), any(), any());
        o.verify(s).createNextVisit(any(), anyLong());
        assertEquals("PENDING_APPROVAL", v.getStatus());
        assertEquals(NOW, v.getFirstSubmissionDate());
        assertEquals(NOW, v.getLatestSubmissionDate());
        assertEquals(NOW, v.getVisitReport().getOtpVerifiedAt());
        assertNull(v.getVisitReport().getOtpReference(), "the typed code is never saved");
        verify(s).createNextVisit(v, NOW);
    }

    @Test
    void wrongCodeChangesNothing() {
        LivelihoodCodeVerify.Steps s = steps(false);
        ScheduledVisit v = waiting();
        assertEquals("AMC_INVALID_SERVICE_CODE", assertThrows(CustomException.class,
                () -> LivelihoodCodeVerify.run(v, FS, "0000", NOW, s)).getCode());
        verify(s, never()).transition(anyString(), any());
        verify(s, never()).save(any(), any(), any());
        verify(s, never()).createNextVisit(any(), anyLong());
        assertEquals("PENDING_OTP_APPROVAL", v.getStatus());
        assertNull(v.getFirstSubmissionDate());
    }

    @Test
    void reworkVerificationKeepsTheFirstDateAndCreatesNoVisit() {
        LivelihoodCodeVerify.Steps s = steps(true);
        ScheduledVisit v = waiting();
        long first = AmcScheduleAndPlanTest.ist(2027, 4, 1, 10, 0);
        v.setFirstSubmissionDate(first);
        LivelihoodCodeVerify.run(v, FS, "1234", NOW, s);
        assertEquals(first, v.getFirstSubmissionDate());
        assertEquals(NOW, v.getLatestSubmissionDate(), "latest always moves (restarts the review SLA)");
        verify(s, never()).createNextVisit(any(), anyLong());
    }

    @Test
    void nextVisitFailureDoesNotFailTheVerification() {
        LivelihoodCodeVerify.Steps s = steps(true);
        doThrow(new RuntimeException("kafka down")).when(s).createNextVisit(any(), anyLong());
        ScheduledVisit v = assertDoesNotThrow(() -> LivelihoodCodeVerify.run(waiting(), FS, "1234", NOW, s));
        assertEquals("PENDING_APPROVAL", v.getStatus());
    }

    @Test
    void workflowFailureSavesNothing() {
        LivelihoodCodeVerify.Steps s = steps(true);
        when(s.transition(anyString(), any())).thenThrow(new CustomException("WORKFLOW_TRANSITION_FAILED", "x"));
        ScheduledVisit v = waiting();
        assertThrows(CustomException.class, () -> LivelihoodCodeVerify.run(v, FS, "1234", NOW, s));
        verify(s, never()).save(any(), any(), any());
        assertNull(v.getFirstSubmissionDate());
    }

    @Test
    void checksBeforeTheCode() {
        LivelihoodCodeVerify.Steps s = steps(true);
        assertEquals("AMC_VISIT_NOT_ASSIGNED_TO_USER", assertThrows(CustomException.class,
                () -> LivelihoodCodeVerify.run(waiting(), "old-fs", "1234", NOW, s)).getCode());
        for (String status : List.of("SCHEDULED", "PENDING_APPROVAL", "APPROVED", "REJECTED")) {
            ScheduledVisit v = waiting();
            v.setStatus(status);
            assertEquals("AMC_VISIT_NOT_SUBMITTABLE", assertThrows(CustomException.class,
                    () -> LivelihoodCodeVerify.run(v, FS, "1234", NOW, s)).getCode(), "repeat after verification: " + status);
        }
        assertEquals("AMC_INVALID_SERVICE_CODE", assertThrows(CustomException.class,
                () -> LivelihoodCodeVerify.run(waiting(), FS, " ", NOW, s)).getCode());
        ScheduledVisit noPhone = waiting();
        noPhone.getFacility().setFacilityPocPhone(null);
        assertEquals("AMC_END_USER_PHONE_MISSING", assertThrows(CustomException.class,
                () -> LivelihoodCodeVerify.run(noPhone, FS, "1234", NOW, s)).getCode(), "E4H skipped validation without a phone");
        verify(s, never()).codeIsValid(anyString(), anyString());
    }

    @Test
    void egovOtpMustConfirmTheCode() {
        assertFalse(LivelihoodCodeVerify.confirmed(null));
        assertFalse(LivelihoodCodeVerify.confirmed(OtpResponse.builder().build()));
        assertFalse(LivelihoodCodeVerify.confirmed(OtpResponse.builder().otp(Otp.builder().otp("1234").validationSuccessful(false).build()).build()),
                "a response with validationSuccessful=false was accepted by E4H");
        assertTrue(LivelihoodCodeVerify.confirmed(OtpResponse.builder().otp(Otp.builder().validationSuccessful(true).build()).build()));
    }
}
