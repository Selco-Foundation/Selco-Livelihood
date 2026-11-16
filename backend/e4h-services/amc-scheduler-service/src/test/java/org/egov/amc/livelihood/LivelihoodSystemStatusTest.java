package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LivelihoodSystemStatusTest {

    static final String SUBJECT = "AMC: system non-functional at {name}";
    static final String BODY = "End user: {name}\\nPhone: {phone}\\nState: {state}\\nDistrict: {district}\\nBlock: {block}\\n\\nSystem non-functional. Please raise a ticket.";

    static ScheduledVisit visit(String status, boolean active) {
        return ScheduledVisit.builder().id("v1").status(status).isActive(active).assignments(List.of(
                ScheduledVisitAssignment.builder().assignedUser("fs-old").isActive(false).build(),
                ScheduledVisitAssignment.builder().assignedUser("fs-now").isActive(true).build())).build();
    }

    LivelihoodSystemStatus.Steps steps(List<String> poc, boolean claimWins) {
        LivelihoodSystemStatus.Steps s = mock(LivelihoodSystemStatus.Steps.class);
        when(s.pocEmails()).thenReturn(poc);
        when(s.storeAnswers(any())).thenReturn(true);
        when(s.claim(anyLong())).thenReturn(claimWins);
        when(s.emailFields()).thenReturn(Map.of("name", "Nipe Brahma", "phone", "9678335201", "state", "Assam", "district", "Baksa", "block", ""));
        return s;
    }

    @Test
    void answersAreStoredOnlyOnOpenLiveVisits() {
        for (String status : List.of("SCHEDULED", "PENDING_OTP_APPROVAL", "REJECTED")) {
            assertTrue(LivelihoodSystemStatus.storable(visit(status, true)), status);
        }
        for (String status : List.of("PENDING_APPROVAL", "APPROVED")) {
            LivelihoodSystemStatus.Steps s = steps(List.of("poc@x"), true);
            LivelihoodSystemStatus.Result r = LivelihoodSystemStatus.run(visit(status, true), "fs-now", true, true, 1L, SUBJECT, BODY, s);
            assertFalse(r.stored(), status);
            verify(s, never()).storeAnswers(any());
        }
        assertFalse(LivelihoodSystemStatus.storable(visit("SCHEDULED", false)), "removed visit (AMC turned off)");
    }

    @Test
    @SuppressWarnings("unchecked")
    void notFunctionalSendsOneEmailWithThePrdFields() {
        LivelihoodSystemStatus.Steps s = steps(List.of("kiran@x", "poc2@x"), true);
        LivelihoodSystemStatus.Result r = LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-now", true, false, 7L, SUBJECT, BODY, s);
        assertTrue(r.stored());
        assertTrue(r.emailSent());
        ArgumentCaptor<Map<String, Object>> answers = ArgumentCaptor.forClass(Map.class);
        verify(s).storeAnswers(answers.capture());
        assertEquals(Map.of("isSystemInUse", true, "isSystemFunctional", false), answers.getValue());
        verify(s).claim(7L);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(s).sendEmail(eq(List.of("kiran@x", "poc2@x")), eq("AMC: system non-functional at Nipe Brahma"), body.capture());
        assertEquals("End user: Nipe Brahma\nPhone: 9678335201\nState: Assam\nDistrict: Baksa\nBlock: -\n\nSystem non-functional. Please raise a ticket.", body.getValue());
    }

    @Test
    void aSecondCallLosesTheClaimAndSendsNothing() {
        LivelihoodSystemStatus.Steps s = steps(List.of("poc@x"), false);
        LivelihoodSystemStatus.Result r = LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-now", true, false, 1L, SUBJECT, BODY, s);
        assertFalse(r.emailSent());
        verify(s, never()).sendEmail(any(), anyString(), anyString());
    }

    @Test
    void functionalSendsNoEmailAndNeedsNoPoc() {
        LivelihoodSystemStatus.Steps s = steps(List.of(), true);
        LivelihoodSystemStatus.Result r = LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-now", false, true, 1L, SUBJECT, BODY, s);
        assertTrue(r.stored());
        assertFalse(r.emailSent());
        verify(s, never()).pocEmails();
        verify(s, never()).claim(anyLong());
    }

    @Test
    void noPocEmailFailsBeforeTheClaim() {
        LivelihoodSystemStatus.Steps s = steps(List.of(), true);
        assertEquals("AMC_PROGRAM_POC_EMAIL_NOT_CONFIGURED", assertThrows(CustomException.class,
                () -> LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-now", true, false, 1L, SUBJECT, BODY, s)).getCode());
        verify(s, never()).claim(anyLong());
    }

    @Test
    void anyoneEverAssignedMayCallOthersMayNot() {
        assertTrue(LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-old", true, true, 1L, SUBJECT, BODY, steps(List.of(), true)).stored(),
                "replaced field staff with a queued offline call");
        assertEquals("AMC_VISIT_NOT_ASSIGNED_TO_USER", assertThrows(CustomException.class,
                () -> LivelihoodSystemStatus.run(visit("SCHEDULED", true), "stranger", true, true, 1L, SUBJECT, BODY, steps(List.of(), true))).getCode());
        assertEquals("AMC_INVALID_SYSTEM_STATUS", assertThrows(CustomException.class,
                () -> LivelihoodSystemStatus.run(visit("SCHEDULED", true), "fs-now", null, true, 1L, SUBJECT, BODY, steps(List.of(), true))).getCode());
    }

    @Test
    void pocEmailsFromMdms() throws Exception {
        ObjectMapper m = new ObjectMapper();
        assertEquals(List.of("kiran.choppa@beehyv.com"), AmcMdmsOptions.parseProgramPocEmails(m.readTree(
                "{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"programPocEmails\":[\"kiran.choppa@beehyv.com\",\" \"]}]}}}")));
        assertEquals(List.of(), AmcMdmsOptions.parseProgramPocEmails(m.readTree("{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"programPocEmails\":[]}]}}}")));
    }
}
