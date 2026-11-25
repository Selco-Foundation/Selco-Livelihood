package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AssetAmcRepository;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AssetAmc;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.common.contract.request.User;
import org.egov.common.contract.workflow.State;
import org.egov.common.producer.Producer;
import org.egov.tracer.model.CustomException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LivelihoodReviewTest {

    static final long NOW = AmcScheduleAndPlanTest.ist(2027, 4, 25, 11, 0);
    static final Set<String> CODES = Set.of("PHOTO_UNCLEAR", "READINGS_MISSING");

    static User reviewer() {
        return User.builder().uuid("rv-1").name("AMC Reviewer")
                .roles(List.of(Role.builder().code("AMC_REVIEWER").tenantId("livelihood").build(),
                        Role.builder().code("EMPLOYEE").tenantId("livelihood").build())).build();
    }

    static ScheduledVisit inReview() {
        ScheduledVisit v = LivelihoodVisitSubmitTest.visit("PENDING_APPROVAL");
        v.setVisitNumber(1);
        v.setAmcConfigurationId("cfg-1");
        v.setFirstSubmissionDate(AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0));
        v.setLatestSubmissionDate(AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0));
        return v;
    }

    LivelihoodReview.Steps steps(String stateAfter) {
        LivelihoodReview.Steps s = mock(LivelihoodReview.Steps.class);
        when(s.activeReasonCodes()).thenReturn(CODES);
        when(s.makePdf(anyString(), anyString(), any(), any(), any(), anyLong())).thenReturn("fs-pdf");
        ProcessInstance pi = new ProcessInstance();
        pi.setState(State.builder().state(stateAfter).build());
        when(s.transition(anyString(), any())).thenReturn(pi);
        return s;
    }

    // ---- reasons ------------------------------------------------------------------------------------

    @Test
    void reworkReasonRules() {
        for (String bad : new String[]{null, "", "not json", "{}", "[]",
                "[{\"reason\":\"WRONG_CODE\",\"comment\":\"x\"}]",
                "[{\"reason\":\"OTHERS\",\"comment\":\"  \"}]",
                "[{\"reason\":\"OTHERS\"}]",
                "[{\"comment\":\"no reason\"}]",
                "[{\"reason\":\"PHOTO_UNCLEAR\"},{\"reason\":\"OTHERS\",\"comment\":\"\"}]"}) {
            assertEquals("AMC_INVALID_REJECTION_REASON", assertThrows(CustomException.class,
                    () -> LivelihoodReview.validateReasons(bad, CODES)).getCode(), String.valueOf(bad));
        }
        assertDoesNotThrow(() -> LivelihoodReview.validateReasons("[{\"reason\":\"OTHERS\",\"comment\":\"Earthing loose\"}]", Set.of()));
        assertDoesNotThrow(() -> LivelihoodReview.validateReasons("[{\"reason\":\"PHOTO_UNCLEAR\"}]", CODES), "comment optional");
        assertDoesNotThrow(() -> LivelihoodReview.validateReasons(
                "[{\"reason\":\"PHOTO_UNCLEAR\",\"comment\":\"retake\"},{\"reason\":\"OTHERS\",\"comment\":\"SPD\"}]", CODES));
    }

    @Test
    void invalidReasonStopsBeforeThePdf() {
        LivelihoodReview.Steps s = steps("REJECTED");
        ScheduledVisit v = inReview();
        assertThrows(CustomException.class, () -> LivelihoodReview.run(v, "REJECT", reviewer(), "livelihood", "[]", NOW, s));
        verify(s, never()).makePdf(anyString(), anyString(), any(), any(), any(), anyLong());
        verify(s, never()).transition(anyString(), any());
        assertEquals("PENDING_APPROVAL", v.getStatus());
    }

    @Test
    void rejectionReasonsFromMdms() throws Exception {
        assertEquals(Set.of("OTHERS", "PHOTO_UNCLEAR"), AmcMdmsOptions.parseRejectionReasonCodes(new ObjectMapper().readTree(
                "{\"MdmsRes\":{\"AMC\":{\"RejectionReasons\":[{\"code\":\"OTHERS\",\"name\":\"Others\"},"
                        + "{\"code\":\"PHOTO_UNCLEAR\",\"active\":true},{\"code\":\"OLD\",\"active\":false}]}}}")));
    }

    // ---- order and saves ----------------------------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void approveRunsInOrderAndChecksCompletion() {
        LivelihoodReview.Steps s = steps("APPROVED");
        ScheduledVisit v = LivelihoodReview.run(inReview(), "APPROVE", reviewer(), "livelihood", null, NOW, s);

        InOrder o = inOrder(s);
        o.verify(s).makePdf("APPROVE", "APPROVED", "AMC Reviewer", "AMC Field Staff", null, NOW);
        o.verify(s).transition("APPROVE", "fs-pdf");
        o.verify(s).save(any(), any());
        o.verify(s).completeIfAllApproved(any());
        verify(s, never()).activeReasonCodes();
        assertEquals("APPROVED", v.getStatus());
        assertEquals("REVIEWER", v.getApprovedBy());
        assertEquals("fs-pdf", ((Map<String, Object>) v.getAdditionalDetails().get("reportPdf")).get("fileStoreId"));
        assertEquals("APPROVED", ((Map<String, Object>) v.getAdditionalDetails().get("reportPdf")).get("visitStatus"));
    }

    @Test
    void rejectSavesWithoutApproverOrCompletion() {
        LivelihoodReview.Steps s = steps("REJECTED");
        String reasons = "[{\"reason\":\"OTHERS\",\"comment\":\"Retake the SPD photo\"}]";
        ScheduledVisit v = LivelihoodReview.run(inReview(), "reject", reviewer(), "livelihood", reasons, NOW, s);
        verify(s).makePdf("REJECT", "REJECTED", "AMC Reviewer", "AMC Field Staff", reasons, NOW);
        assertEquals("REJECTED", v.getStatus());
        assertNull(v.getApprovedBy());
        verify(s, never()).completeIfAllApproved(any());
        assertEquals(AmcScheduleAndPlanTest.ist(2027, 4, 20, 15, 0), v.getFirstSubmissionDate(), "dates untouched");
    }

    @Test
    void completionFailureDoesNotFailTheApproval() {
        LivelihoodReview.Steps s = steps("APPROVED");
        doThrow(new RuntimeException("db")).when(s).completeIfAllApproved(any());
        assertEquals("APPROVED", assertDoesNotThrow(() -> LivelihoodReview.run(inReview(), "APPROVE", reviewer(), "livelihood", null, NOW, s)).getStatus());
    }

    @Test
    void onlyReviewersAndOnlyReportsWaitingForReview() {
        LivelihoodReview.Steps s = steps("APPROVED");
        User fieldStaff = User.builder().uuid(LivelihoodVisitSubmitTest.FS)
                .roles(List.of(Role.builder().code("AMC_FIELD_STAFF").tenantId("livelihood").build())).build();
        assertEquals("AMC_ACTION_NOT_ALLOWED", assertThrows(CustomException.class,
                () -> LivelihoodReview.run(inReview(), "APPROVE", fieldStaff, "livelihood", null, NOW, s)).getCode());
        User otherTenant = User.builder().roles(List.of(Role.builder().code("AMC_REVIEWER").tenantId("in").build())).build();
        assertThrows(CustomException.class, () -> LivelihoodReview.run(inReview(), "APPROVE", otherTenant, "livelihood", null, NOW, s));
        for (String status : List.of("APPROVED", "REJECTED", "SCHEDULED", "PENDING_OTP_APPROVAL")) {
            ScheduledVisit v = inReview();
            v.setStatus(status);
            assertEquals("AMC_VISIT_NOT_REVIEWABLE", assertThrows(CustomException.class,
                    () -> LivelihoodReview.run(v, "APPROVE", reviewer(), "livelihood", null, NOW, s)).getCode(), status);
        }
        verify(s, never()).makePdf(anyString(), anyString(), any(), any(), any(), anyLong());
    }

    // ---- completion ---------------------------------------------------------------------------------

    @Test
    void completionCounterCountsTheVisitBeingApproved() {
        assertTrue(LivelihoodReview.allApproved(0, 1), "one-visit AMC: this approval completes it");
        assertTrue(LivelihoodReview.allApproved(1, 2));
        assertFalse(LivelihoodReview.allApproved(0, 2), "visit 2 still open");
        assertFalse(LivelihoodReview.allApproved(1, 3));
        assertFalse(LivelihoodReview.allApproved(0, 0));
    }

    AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
    LivelihoodNextVisitService configs = mock(LivelihoodNextVisitService.class);
    AssetAmcRepository assetRepo = mock(AssetAmcRepository.class);
    Producer producer = mock(Producer.class);
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    RequestInfo ri = RequestInfo.builder().userInfo(reviewer()).build();

    LivelihoodCompletionService completion(int approvedOthers, int duration, int frequency, String status) {
        when(config.getUpdateAmcConfigurationTopic()).thenReturn("update-amc-configuration");
        when(config.getUpdateAssetAmcTopic()).thenReturn("update-asset-amc");
        AmcConfiguration cfg = LivelihoodNextVisitTest.active(duration, frequency);
        cfg.setStatus(status);
        when(configs.load(anyString(), anyString())).thenReturn(cfg);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(approvedOthers);
        when(assetRepo.getAssetAmc(any(), any(), any(), anyString(), any(), any())).thenReturn(List.of(
                AssetAmc.builder().id("aa-1").assetId("Ast/2026/0140").status("ACTIVE").amcStartDate(1L).amcEndDate(9L)
                        .auditDetails(AuditDetails.builder().createdBy("pm").createdTime(1L).build()).build(),
                AssetAmc.builder().id("aa-0").status("EXPIRED").build()));
        return new LivelihoodCompletionService(config, configs, assetRepo, producer, jdbc);
    }

    @Test
    @SuppressWarnings("unchecked")
    void lastApprovalCompletesTheAmcAndExpiresTheAssetLink() {
        assertTrue(completion(0, 12, 12, "ACTIVE").completeIfAllApproved(inReview(), ri));

        ArgumentCaptor<Object> cfgMsg = ArgumentCaptor.forClass(Object.class);
        verify(producer).push(eq("update-amc-configuration"), cfgMsg.capture());
        AmcConfiguration cfg = (AmcConfiguration) ((List<?>) ((Map<String, Object>) cfgMsg.getValue()).get("AmcConfigurations")).get(0);
        assertEquals("COMPLETED", cfg.getStatus());
        assertEquals("pm", cfg.getAuditDetails().getCreatedBy(), "created audit kept");
        assertEquals("rv-1", cfg.getAuditDetails().getLastModifiedBy());

        ArgumentCaptor<Object> aaMsg = ArgumentCaptor.forClass(Object.class);
        verify(producer).push(eq("update-asset-amc"), aaMsg.capture());
        List<AssetAmc> links = (List<AssetAmc>) ((Map<String, Object>) aaMsg.getValue()).get("AssetAmcs");
        assertEquals(1, links.size(), "only the ACTIVE link");
        assertEquals("EXPIRED", links.get(0).getStatus());
        assertEquals(LivelihoodAmc.startOfIstDay(LivelihoodAmc.istDay(System.currentTimeMillis())), links.get(0).getAmcEndDate());
        assertEquals("Ast/2026/0140", links.get(0).getAssetId(), "full row kept");
    }

    @Test
    void openVisitsOrNotActiveMeansNotComplete() {
        assertFalse(completion(0, 12, 6, "ACTIVE").completeIfAllApproved(inReview(), ri), "visit 2 still open");
        verifyNoInteractions(producer);
        assertFalse(completion(0, 12, 12, "CANCELLED").completeIfAllApproved(inReview(), ri));
        verifyNoInteractions(producer);
    }
}
