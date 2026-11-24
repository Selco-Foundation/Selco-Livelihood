package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.common.contract.workflow.State;
import org.egov.amc.web.models.User;
import org.egov.amc.web.models.VisitReport;
import org.egov.amc.web.models.VisitReportDocument;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LivelihoodVisitSubmitTest {

    static final String FS = "e91845d7-51eb-41d5-8f1a-237bd8296c07";
    static final long DUE = AmcScheduleAndPlanTest.day(2027, 5, 16);

    static ScheduledVisit visit(String status) {
        VisitReport report = VisitReport.builder()
                .responses(Map.of("neVoltagePcuOutput", 3))
                .additionalDetails(Map.of("systemStatus", Map.of("isSystemInUse", true, "isSystemFunctional", true)))
                .documents(List.of(VisitReportDocument.builder().documentType("AMC_VERIFICATION_PHOTO").fileStoreId("fs-photo").build()))
                .build();
        return ScheduledVisit.builder().id("v1").tenantId("livelihood").status(status).scheduledDate(DUE)
                .facility(Facility.builder().facilityName("Nipe Brahma").facilityPocPhone("9678335201").build())
                .assignments(List.of(
                        ScheduledVisitAssignment.builder().assignedUser("old-fs").isActive(false).build(),
                        ScheduledVisitAssignment.builder().assignedUser(FS).isActive(true)
                                .user(User.builder().name("AMC Field Staff").build()).build()))
                .additionalDetails(Map.of("note", "kept"))
                .visitReport(report)
                .build();
    }

    static long istNoon(int y, int m, int d) {
        return AmcScheduleAndPlanTest.ist(y, m, d, 12, 0);
    }

    LivelihoodVisitSubmit.Steps steps() {
        LivelihoodVisitSubmit.Steps s = mock(LivelihoodVisitSubmit.Steps.class);
        when(s.submissionWindowDays()).thenReturn(30);
        when(s.makePdf(any(), anyLong())).thenReturn("fs-pdf");
        when(s.createCode(anyString())).thenReturn("4821");
        ProcessInstance pi = new ProcessInstance();
        pi.setState(State.builder().state("PENDING_OTP_APPROVAL").build());
        when(s.transition(any())).thenReturn(pi);
        return s;
    }

    // ---- window (first submit only) ----------------------------------------------------------------

    @Test
    void windowOpensExactlyThirtyDaysBeforeTheDueDate() {
        assertDoesNotThrow(() -> LivelihoodVisitSubmit.checkWindow(DUE, istNoon(2027, 4, 16), 30), "due - 30 = allowed");
        CustomException e = assertThrows(CustomException.class, () -> LivelihoodVisitSubmit.checkWindow(DUE, istNoon(2027, 4, 15), 30));
        assertEquals("AMC_SUBMISSION_WINDOW_NOT_OPEN", e.getCode(), "due - 31 = rejected");
        assertDoesNotThrow(() -> LivelihoodVisitSubmit.checkWindow(DUE, istNoon(2027, 6, 1), 30), "late stays open");
        // 00:30 IST on 16 Apr is still 15 Apr in UTC: the IST day counts
        assertDoesNotThrow(() -> LivelihoodVisitSubmit.checkWindow(DUE, AmcScheduleAndPlanTest.ist(2027, 4, 16, 0, 30), 30));
    }

    @Test
    void reworkSkipsTheWindow() {
        LivelihoodVisitSubmit.Steps s = steps();
        LivelihoodVisitSubmit.run(visit("REJECTED"), FS, istNoon(2026, 11, 16), s);
        verify(s, never()).submissionWindowDays();
        verify(s).sendCode("9678335201", "4821");
    }

    @Test
    void firstSubmitOutsideTheWindowStopsBeforeAnythingElse() {
        LivelihoodVisitSubmit.Steps s = steps();
        CustomException e = assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2026, 11, 16), s));
        assertEquals("AMC_SUBMISSION_WINDOW_NOT_OPEN", e.getCode());
        verify(s, never()).makePdf(any(), anyLong());
        verify(s, never()).sendCode(any(), any());
    }

    // ---- checks ------------------------------------------------------------------------------------

    @Test
    void onlyTheActiveFieldStaffCanSubmit() {
        assertEquals("AMC_VISIT_NOT_ASSIGNED_TO_USER", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.run(visit("REJECTED"), "old-fs", istNoon(2027, 5, 1), steps())).getCode());
        assertEquals("AMC_VISIT_NOT_ASSIGNED_TO_USER", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.run(visit("REJECTED"), "someone", istNoon(2027, 5, 1), steps())).getCode());
    }

    @Test
    void onlyNewOrReworkVisitsCanBeSubmitted() {
        for (String status : List.of("PENDING_OTP_APPROVAL", "PENDING_APPROVAL", "APPROVED", "DRAFT")) {
            assertEquals("AMC_VISIT_NOT_SUBMITTABLE", assertThrows(CustomException.class,
                    () -> LivelihoodVisitSubmit.run(visit(status), FS, istNoon(2027, 5, 1), steps())).getCode(), status);
        }
    }

    @Test
    void verificationPhotoIsRequired() {
        ScheduledVisit v = visit("SCHEDULED");
        v.getVisitReport().setDocuments(List.of(VisitReportDocument.builder().documentType("image").fileStoreId("x").build()));
        LivelihoodVisitSubmit.Steps s = steps();
        assertEquals("AMC_VERIFICATION_PHOTO_MISSING", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.run(v, FS, istNoon(2027, 5, 1), s)).getCode());
        verify(s, never()).makePdf(any(), anyLong());
        v.getVisitReport().setDocuments(null);
        assertThrows(CustomException.class, () -> LivelihoodVisitSubmit.checkVerificationPhoto(v.getVisitReport()));
    }

    @Test
    void endUserPhoneMustBeThereAndDecrypted() {
        for (String phone : new String[]{null, " ", "691872|Xk9a2b=="}) {
            ScheduledVisit v = visit("SCHEDULED");
            v.getFacility().setFacilityPocPhone(phone);
            LivelihoodVisitSubmit.Steps s = steps();
            assertEquals("AMC_END_USER_PHONE_MISSING", assertThrows(CustomException.class,
                    () -> LivelihoodVisitSubmit.run(v, FS, istNoon(2027, 5, 1), s)).getCode());
            verify(s, never()).makePdf(any(), anyLong());
        }
    }

    @Test
    void systemOnlyActionsAreRefusedFromClients() {
        for (String a : List.of("AUTO_APPROVE", "SCHEDULE", "RESET_FOR_REASSIGNMENT", "auto_approve")) {
            assertEquals("AMC_ACTION_NOT_ALLOWED", assertThrows(CustomException.class,
                    () -> LivelihoodVisitSubmit.rejectSystemOnlyAction(a)).getCode());
        }
        assertDoesNotThrow(() -> LivelihoodVisitSubmit.rejectSystemOnlyAction("SUBMIT_VISIT_REPORT"));
        assertDoesNotThrow(() -> LivelihoodVisitSubmit.rejectSystemOnlyAction("APPROVE"));
    }

    // ---- order -------------------------------------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void stepsRunInOrderAndTheCodeGoesOutLast() {
        LivelihoodVisitSubmit.Steps s = steps();
        long now = istNoon(2027, 5, 1);
        ScheduledVisit v = LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, now, s);

        InOrder o = inOrder(s);
        o.verify(s).submissionWindowDays();
        o.verify(s).makePdf("AMC Field Staff", now);
        o.verify(s).createCode("9678335201");
        o.verify(s).transition("fs-pdf");
        o.verify(s).save(any(), any());
        o.verify(s).sendCode("9678335201", "4821");

        assertEquals("PENDING_OTP_APPROVAL", v.getStatus());
        assertEquals(now, v.getActualVisitDate());
        assertEquals("kept", v.getAdditionalDetails().get("note"));
        assertEquals(Map.of("isSystemInUse", true, "isSystemFunctional", true), v.getAdditionalDetails().get("systemStatus"));
        Map<String, Object> pdf = (Map<String, Object>) v.getAdditionalDetails().get("reportPdf");
        assertEquals(Map.of("fileStoreId", "fs-pdf", "visitStatus", "PENDING_OTP_APPROVAL", "generatedAt", now, "submittedAt", now), pdf);
    }

    @Test
    void pdfFailureStopsBeforeTheCode() {
        LivelihoodVisitSubmit.Steps s = steps();
        when(s.makePdf(any(), anyLong())).thenThrow(new CustomException("AMC_PDF_GENERATION_FAILED", "x"));
        assertThrows(CustomException.class, () -> LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2027, 5, 1), s));
        verify(s, never()).createCode(any());
        verify(s, never()).transition(any());
        verify(s, never()).save(any(), any());
        verify(s, never()).sendCode(any(), any());
    }

    @Test
    void noCodeMeansNothingIsSaved() {
        LivelihoodVisitSubmit.Steps s = steps();
        when(s.createCode(anyString())).thenReturn(null);
        assertEquals("AMC_SERVICE_CODE_FAILED", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2027, 5, 1), s)).getCode());
        verify(s, never()).transition(any());
        verify(s, never()).sendCode(any(), any());
    }

    @Test
    void workflowFailureNeverSendsTheCode() {
        LivelihoodVisitSubmit.Steps s = steps();
        when(s.transition(any())).thenThrow(new CustomException("WORKFLOW_TRANSITION_FAILED", "x"));
        assertThrows(CustomException.class, () -> LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2027, 5, 1), s));
        verify(s, never()).save(any(), any());
        verify(s, never()).sendCode(any(), any());
    }

    @Test
    void smsFailureDoesNotUndoTheSubmit() {
        LivelihoodVisitSubmit.Steps s = steps();
        doThrow(new RuntimeException("kafka down")).when(s).sendCode(any(), any());
        ScheduledVisit v = assertDoesNotThrow(() -> LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2027, 5, 1), s));
        assertEquals("PENDING_OTP_APPROVAL", v.getStatus());
        verify(s).save(any(), any());
    }

    @Test
    void pdfSwitchedOffStillSubmitsWithoutReportPdf() {
        LivelihoodVisitSubmit.Steps s = steps();
        when(s.makePdf(any(), anyLong())).thenReturn(null);
        ScheduledVisit v = LivelihoodVisitSubmit.run(visit("SCHEDULED"), FS, istNoon(2027, 5, 1), s);
        verify(s).transition(null);
        assertEquals(null, v.getAdditionalDetails().get("reportPdf"));
    }

    // ---- resend ------------------------------------------------------------------------------------

    @Test
    void resendOnlyWhileWaitingForTheCode() {
        assertEquals("9678335201", LivelihoodVisitSubmit.checkResend(visit("PENDING_OTP_APPROVAL"), FS));
        assertEquals("AMC_VISIT_NOT_SUBMITTABLE", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.checkResend(visit("SCHEDULED"), FS)).getCode());
        assertEquals("AMC_VISIT_NOT_ASSIGNED_TO_USER", assertThrows(CustomException.class,
                () -> LivelihoodVisitSubmit.checkResend(visit("PENDING_OTP_APPROVAL"), "old-fs")).getCode());
    }

    @Test
    void submissionWindowDaysFromMdmsWithDefault() throws Exception {
        ObjectMapper m = new ObjectMapper();
        assertEquals(30, AmcMdmsOptions.parseSubmissionWindowDays(m.readTree(
                "{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"code\":\"DEFAULT\",\"submissionWindowDays\":30}]}}}")));
        assertEquals(400, AmcMdmsOptions.parseSubmissionWindowDays(m.readTree(
                "{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"submissionWindowDays\":400}]}}}")));
        assertEquals(30, AmcMdmsOptions.parseSubmissionWindowDays(m.readTree("{\"MdmsRes\":{}}")));
    }
}
