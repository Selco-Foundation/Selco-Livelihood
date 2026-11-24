package org.egov.amc.livelihood;

import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.workflow.State;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Auto-approval inside code verification (LLD §6.8 order (a)-(e)). */
class AutoApproveFlowTest {

    static final long NOW = LivelihoodCodeVerifyTest.NOW;
    static final Map<String, Object> PASSED = Map.of("passed", true, "rules", java.util.List.of());
    static final Map<String, Object> FAILED = Map.of("passed", false, "rules", java.util.List.of());

    LivelihoodCodeVerify.Steps steps(Map<String, Object> rules, boolean codeOk) {
        LivelihoodCodeVerify.Steps s = mock(LivelihoodCodeVerify.Steps.class);
        when(s.evaluateRules(any(), anyLong())).thenReturn(rules);
        when(s.makePdf(any(), any(), anyLong())).thenReturn("fs-pdf");
        when(s.codeIsValid(anyString(), anyString())).thenReturn(codeOk);
        ProcessInstance approved = new ProcessInstance();
        approved.setState(State.builder().state("APPROVED").build());
        ProcessInstance review = new ProcessInstance();
        review.setState(State.builder().state("PENDING_APPROVAL").build());
        when(s.transition(eq("AUTO_APPROVE"), any())).thenReturn(approved);
        when(s.transition(eq("SUBMIT_OTP"), any())).thenReturn(review);
        return s;
    }

    @Test
    @SuppressWarnings("unchecked")
    void allRulesPassApprovesDirectly() {
        LivelihoodCodeVerify.Steps s = steps(PASSED, true);
        ScheduledVisit v = LivelihoodCodeVerify.run(LivelihoodCodeVerifyTest.waiting(), LivelihoodCodeVerifyTest.FS, "1234", NOW, s);

        InOrder o = inOrder(s);
        o.verify(s).evaluateRules(any(), eq(NOW));
        o.verify(s).makePdf(eq("AUTO_APPROVE"), any(), eq(NOW));
        o.verify(s).codeIsValid(anyString(), eq("1234"));
        o.verify(s).transition("AUTO_APPROVE", "fs-pdf");
        o.verify(s).save(any(), any(), eq(PASSED));
        o.verify(s).createNextVisit(any(), eq(NOW));
        o.verify(s).completeIfAllApproved(any());
        assertEquals("APPROVED", v.getStatus());
        assertEquals("SYSTEM", v.getApprovedBy());
        assertEquals(PASSED, v.getAdditionalDetails().get("autoApproval"));
        assertEquals("fs-pdf", ((Map<String, Object>) v.getAdditionalDetails().get("reportPdf")).get("fileStoreId"));
        assertEquals(NOW, v.getFirstSubmissionDate());
    }

    @Test
    void aFailedRuleGoesToAReviewerWithTheResultKept() {
        LivelihoodCodeVerify.Steps s = steps(FAILED, true);
        ScheduledVisit v = LivelihoodCodeVerify.run(LivelihoodCodeVerifyTest.waiting(), LivelihoodCodeVerifyTest.FS, "1234", NOW, s);
        verify(s).makePdf(eq("SUBMIT_OTP"), any(), eq(NOW));
        verify(s).transition("SUBMIT_OTP", "fs-pdf");
        verify(s, never()).completeIfAllApproved(any());
        assertEquals("PENDING_APPROVAL", v.getStatus());
        assertNull(v.getApprovedBy());
        assertEquals(FAILED, v.getAdditionalDetails().get("autoApproval"), "the reviewer sees which rule failed");
    }

    @Test
    void switchedOffIsTheReviewerPath() {
        LivelihoodCodeVerify.Steps s = steps(null, true);
        ScheduledVisit v = LivelihoodCodeVerify.run(LivelihoodCodeVerifyTest.waiting(), LivelihoodCodeVerifyTest.FS, "1234", NOW, s);
        verify(s).transition("SUBMIT_OTP", "fs-pdf");
        assertNull(v.getAdditionalDetails().get("autoApproval"));
    }

    @Test
    void pdfFailureLeavesTheCodeUnused() {
        LivelihoodCodeVerify.Steps s = steps(PASSED, true);
        when(s.makePdf(any(), any(), anyLong())).thenThrow(new CustomException("AMC_PDF_GENERATION_FAILED", "x"));
        ScheduledVisit v = LivelihoodCodeVerifyTest.waiting();
        assertThrows(CustomException.class, () -> LivelihoodCodeVerify.run(v, LivelihoodCodeVerifyTest.FS, "1234", NOW, s));
        verify(s, never()).codeIsValid(anyString(), anyString());
        verify(s, never()).transition(anyString(), any());
        assertEquals("PENDING_OTP_APPROVAL", v.getStatus());
    }

    @Test
    void wrongCodeAfterPassingRulesChangesNothing() {
        LivelihoodCodeVerify.Steps s = steps(PASSED, false);
        ScheduledVisit v = LivelihoodCodeVerifyTest.waiting();
        assertEquals("AMC_INVALID_SERVICE_CODE", assertThrows(CustomException.class,
                () -> LivelihoodCodeVerify.run(v, LivelihoodCodeVerifyTest.FS, "0000", NOW, s)).getCode());
        verify(s, never()).transition(anyString(), any());
        verify(s, never()).save(any(), any(), any());
        assertNull(v.getFirstSubmissionDate());
    }

    @Test
    void autoApprovedReworkKeepsFirstDateAndCreatesNoVisit() {
        LivelihoodCodeVerify.Steps s = steps(PASSED, true);
        ScheduledVisit v = LivelihoodCodeVerifyTest.waiting();
        v.setFirstSubmissionDate(5L);
        LivelihoodCodeVerify.run(v, LivelihoodCodeVerifyTest.FS, "1234", NOW, s);
        assertEquals(5L, v.getFirstSubmissionDate());
        verify(s, never()).createNextVisit(any(), anyLong());
        verify(s).completeIfAllApproved(any());
    }
}
