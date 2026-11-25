package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.LivelihoodActivationService.Outcome;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.service.VisitWorkflowService;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ProcessInstance;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class LivelihoodActivationTest {

    AMCServiceConfiguration config = mock(AMCServiceConfiguration.class);
    AmcConfigurationRepository repo = mock(AmcConfigurationRepository.class);
    InstallationRowClient rows = mock(InstallationRowClient.class);
    SolarAssetClient assets = mock(SolarAssetClient.class);
    SystemUserProvider sysUser = mock(SystemUserProvider.class);
    VisitWorkflowService workflow = mock(VisitWorkflowService.class);
    AmcConfigurationServiceUtil util = mock(AmcConfigurationServiceUtil.class);
    Producer producer = mock(Producer.class);
    JdbcTemplate jdbc = mock(JdbcTemplate.class);
    LivelihoodActivationService service;
    RequestInfo caller = RequestInfo.builder().userInfo(User.builder().uuid("qc-1").build()).build();

    @BeforeEach
    void setUp() {
        when(config.getActivateAmcConfigurationTopic()).thenReturn("activate-amc-configuration");
        when(config.getSaveActiveAmcConfigurationTopic()).thenReturn("save-active-amc-configuration");
        when(sysUser.requestInfo()).thenReturn(RequestInfo.builder().userInfo(User.builder().uuid("sys").build()).build());
        when(util.getAuditDetails(anyString(), any(), anyBoolean())).thenReturn(
                AuditDetails.builder().createdBy("qc-1").createdTime(5L).lastModifiedBy("qc-1").lastModifiedTime(5L).build());
        service = new LivelihoodActivationService(config, repo, rows, assets, sysUser, workflow, util, producer, jdbc);
    }

    void running(AmcConfiguration cfg) {
        when(repo.getAmcConfiguration(any(), anyInt(), anyInt(), anyString(), any(), any()))
                .thenReturn(cfg == null ? List.of() : List.of(cfg));
    }

    @Test
    void noRunningAmcIsANoOp() {
        running(null);
        assertEquals(Outcome.NO_RUNNING_AMC, service.activate("livelihood", "row-1", 10L, caller).outcome());
        verifyNoInteractions(workflow, producer);
    }

    @Test
    void alreadyActiveIsANoOp() {
        AmcConfiguration cfg = AmcScheduleAndPlanTest.pendingConfig();
        cfg.setStatus("ACTIVE");
        running(cfg);
        assertEquals(Outcome.ALREADY_ACTIVE, service.activate("livelihood", "row-1", 10L, caller).outcome());
        verifyNoInteractions(workflow, producer);
    }

    @Test
    void notApprovedYetStaysPending() {
        running(AmcScheduleAndPlanTest.pendingConfig());
        when(rows.findByIds(any(), anyString(), any())).thenReturn(Map.of("row-1",
                new InstallationRow("row-1", "livelihood", "ED/1", "p", "fp", "SOLAR", "SUBMITTED_BY_FIELD_STAFF", 0)));
        assertEquals(Outcome.NOT_APPROVED_YET, service.activate("livelihood", "row-1", null, caller).outcome());
        verifyNoInteractions(workflow, producer);
    }

    @Test
    void missingSolarAssetStaysPending() {
        running(AmcScheduleAndPlanTest.pendingConfig());
        when(assets.findSolarAssetId(eq("row-1"), anyString(), any())).thenReturn(null);
        assertEquals(Outcome.SOLAR_ASSET_MISSING, service.activate("livelihood", "row-1", 10L, caller).outcome());
        verifyNoInteractions(workflow, producer);
    }

    @Test
    @SuppressWarnings("unchecked")
    void activationSchedulesThenSendsOneMessage() {
        running(AmcScheduleAndPlanTest.pendingConfig());
        when(assets.findSolarAssetId(eq("row-1"), anyString(), any())).thenReturn("Ast/2026/0150");
        when(workflow.getProcessInstanceById(anyString(), anyString(), any())).thenReturn(null);
        long approvedAt = AmcScheduleAndPlanTest.ist(2026, 11, 14, 16, 30);

        LivelihoodActivationService.Result r = service.activate("livelihood", "row-1", approvedAt, caller);

        assertEquals(Outcome.ACTIVATED, r.outcome());
        assertEquals(AmcSchedule.visitId("cfg-1", 1), r.visitId());
        verify(workflow).transitionWorkflow(any(ScheduledVisit.class), eq("SCHEDULE"), any(), any(), anyString());
        ArgumentCaptor<Object> msg = ArgumentCaptor.forClass(Object.class);
        verify(producer).push(eq("activate-amc-configuration"), msg.capture());
        Map<String, Object> body = (Map<String, Object>) msg.getValue();
        assertEquals(1, ((List<?>) body.get("AmcConfigurations")).size());
        assertEquals(1, ((List<?>) body.get("ScheduledVisit")).size());
        assertEquals(1, ((List<?>) body.get("AssetAmcs")).size());
        AmcConfiguration cfg = (AmcConfiguration) ((List<?>) body.get("AmcConfigurations")).get(0);
        assertEquals("ACTIVE", cfg.getStatus());
        assertEquals(AmcSchedule.startOfDay(approvedAt), cfg.getConfigurationStartDate());
        // the message serialises with the keys the persister reads
        Map<String, Object> json = new ObjectMapper().convertValue(body, Map.class);
        assertNotNull(((Map<String, Object>) ((List<?>) json.get("ScheduledVisit")).get(0)).get("vendorId"));
    }

    @Test
    void repeatAfterCompletionWritesNothing() {
        when(workflow.getProcessInstanceById(anyString(), anyString(), any())).thenReturn(List.of(new ProcessInstance()));
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(1);
        ScheduledVisit v = ScheduledVisit.builder().id("v1").tenantId("livelihood").visitNumber(1).build();
        assertFalse(service.scheduleIfNeeded(v, caller));
        verify(workflow, never()).transitionWorkflow(any(), anyString(), any(), any(), anyString());
    }

    @Test
    void halfDoneAttemptIsCompleted() {
        when(workflow.getProcessInstanceById(anyString(), anyString(), any())).thenReturn(List.of(new ProcessInstance()));
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any(Object[].class))).thenReturn(0);
        ScheduledVisit v = ScheduledVisit.builder().id("v1").tenantId("livelihood").visitNumber(1).build();
        assertTrue(service.scheduleIfNeeded(v, caller), "workflow done, rows missing: write them now");
        verify(workflow, never()).transitionWorkflow(any(), anyString(), any(), any(), anyString());
    }

    @Test
    void nothingToPersistForNoActivePlans() {
        service.persistActiveCreates(List.of(), caller);
        verifyNoInteractions(producer, workflow);
    }
}
