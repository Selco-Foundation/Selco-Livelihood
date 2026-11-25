package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.service.VisitWorkflowService;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationSearchCriteria;
import org.egov.amc.web.models.AmcConfigurationSearchRequest;
import org.egov.amc.web.models.AssetAmc;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.egov.amc.livelihood.LivelihoodAmc.*;

/**
 * Starts Livelihood AMCs (LLD 07 §6.3): when the installation report of a SOLAR row is approved
 * ({@code _activate}), by hand for any that were missed ({@code _activate-pending}), and when the PM turns AMC
 * on for an already-approved installation (create). Each time: the workflow SCHEDULE step for visit 1 first,
 * as the system user, then ONE persister message (one DB transaction) with the configuration, visit 1 and the
 * asset_amc link. Visit and asset_amc ids are fixed, so a repeat writes nothing new.
 */
@Slf4j
@Service
public class LivelihoodActivationService {

    public enum Outcome { ACTIVATED, NO_RUNNING_AMC, ALREADY_ACTIVE, NOT_APPROVED_YET, SOLAR_ASSET_MISSING }

    public record Result(Outcome outcome, String configurationId, String visitId) {
    }

    static final String SCHEDULE = "SCHEDULE";

    private final AMCServiceConfiguration config;
    private final AmcConfigurationRepository configurationRepository;
    private final InstallationRowClient installationRows;
    private final SolarAssetClient solarAssets;
    private final SystemUserProvider systemUser;
    private final VisitWorkflowService workflow;
    private final AmcConfigurationServiceUtil util;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;

    public LivelihoodActivationService(AMCServiceConfiguration config, AmcConfigurationRepository configurationRepository,
                                       InstallationRowClient installationRows, SolarAssetClient solarAssets,
                                       SystemUserProvider systemUser, VisitWorkflowService workflow,
                                       AmcConfigurationServiceUtil util, Producer producer, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.configurationRepository = configurationRepository;
        this.installationRows = installationRows;
        this.solarAssets = solarAssets;
        this.systemUser = systemUser;
        this.workflow = workflow;
        this.util = util;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Activates the running AMC of an installation row, if there is one and the row is approved.
     * Never fails the caller for a business reason: those come back as the outcome (the installation
     * service calls this best-effort, and {@code _activate-pending} retries later).
     *
     * @param approvedAt the approval time just set by the installation service (optional: its own save is
     *                   asynchronous, so the row may not show it yet); otherwise read from the row
     */
    public Result activate(String tenantId, String activityFacilityId, Long approvedAt, RequestInfo caller) {
        AmcConfiguration cfg = loadRunning(tenantId, activityFacilityId);
        if (cfg == null) {
            log.info("Activate {}: no running AMC", activityFacilityId);
            return new Result(Outcome.NO_RUNNING_AMC, null, null);
        }
        if (STATUS_ACTIVE.equals(cfg.getStatus())) {
            return new Result(Outcome.ALREADY_ACTIVE, cfg.getId(), AmcSchedule.visitId(cfg.getId(), 1));
        }

        long approval = isSet(approvedAt) ? approvedAt : approvalDate(tenantId, activityFacilityId, caller);
        if (approval <= 0) {
            log.info("Activate {}: installation not approved yet (or approval not saved yet), AMC {} stays pending",
                    activityFacilityId, cfg.getId());
            return new Result(Outcome.NOT_APPROVED_YET, cfg.getId(), null);
        }

        String assetId = solarAssets.findSolarAssetId(activityFacilityId, tenantId, caller);
        if (assetId == null) {
            log.warn("Activate {}: no SOLAR asset, AMC {} stays pending", activityFacilityId, cfg.getId());
            return new Result(Outcome.SOLAR_ASSET_MISSING, cfg.getId(), null);
        }

        ActivationPlan plan = ActivationPlan.of(cfg, AmcSchedule.startOfDay(approval), assetId, audit(caller));
        RequestInfo sys = systemUser.requestInfo();
        if (scheduleIfNeeded(plan.firstVisit(), sys)) {
            producer.push(config.getActivateAmcConfigurationTopic(), message(sys, List.of(plan)));
            log.info("Activated AMC {} for row {}: start {}, visit 1 due {}", cfg.getId(), activityFacilityId,
                    istDay(plan.configuration().getConfigurationStartDate()), istDay(plan.firstVisit().getScheduledDate()));
        }
        return new Result(Outcome.ACTIVATED, cfg.getId(), plan.firstVisit().getId());
    }

    /** By hand only (LLD §6.3): every pending AMC whose installation is approved and has its SOLAR asset. */
    public Map<String, Object> activatePending(String tenantId, RequestInfo caller) {
        List<Map<String, Object>> pending = jdbcTemplate.queryForList(
                "SELECT id, activity_facility_id FROM amc_configuration WHERE tenant_id = ? AND is_active"
                        + " AND status = ? AND activity_facility_id IS NOT NULL", tenantId, STATUS_PENDING_ACTIVATION);
        List<String> rowIds = pending.stream().map(r -> (String) r.get("activity_facility_id")).toList();
        Map<String, InstallationRow> rows = installationRows.findByIds(rowIds, tenantId, caller);
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Outcome o : Outcome.values()) {
            counts.put(o.name(), 0);
        }
        List<String> activated = new ArrayList<>();
        for (String rowId : rowIds) {
            InstallationRow row = rows.get(rowId);
            Outcome outcome;
            if (row == null || !row.isApproved() || row.completedAt() <= 0) {
                outcome = Outcome.NOT_APPROVED_YET;
            } else {
                Result r = activate(tenantId, rowId, row.completedAt(), caller);
                outcome = r.outcome();
                if (outcome == Outcome.ACTIVATED) {
                    activated.add(r.configurationId());
                }
            }
            counts.merge(outcome.name(), 1, Integer::sum);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("pendingChecked", rowIds.size());
        out.put("outcomes", counts);
        out.put("activatedConfigurationIds", activated);
        return out;
    }

    /** Create on an already-approved installation: SCHEDULE every visit 1 first, then one combined message. */
    public void persistActiveCreates(List<ActivationPlan> plans, RequestInfo caller) {
        if (plans == null || plans.isEmpty()) {
            return;
        }
        RequestInfo sys = systemUser.requestInfo();
        List<ActivationPlan> toWrite = new ArrayList<>();
        for (ActivationPlan p : plans) {
            if (scheduleIfNeeded(p.firstVisit(), sys)) {
                toWrite.add(p);
            }
        }
        if (!toWrite.isEmpty()) {
            producer.push(config.getSaveActiveAmcConfigurationTopic(), message(caller, toWrite));
        }
    }

    /**
     * SCHEDULE for the visit unless its workflow already exists; true when the rows still have to be written.
     * A repeat (a retry, or _activate-pending racing an activation) finds the workflow already there; if the
     * visit row also exists the earlier attempt finished and nothing is written again (LLD §6.3 step 5).
     */
    boolean scheduleIfNeeded(ScheduledVisit visit, RequestInfo sys) {
        List<ProcessInstance> existing = workflow.getProcessInstanceById(visit.getId(), visit.getTenantId(), sys);
        if (existing == null || existing.isEmpty()) {
            workflow.transitionWorkflow(visit, SCHEDULE, null, sys, "AMC visit " + visit.getVisitNumber() + " created");
            return true;
        }
        Integer rows = jdbcTemplate.queryForObject("SELECT count(*) FROM scheduled_visits WHERE id = ?",
                Integer.class, visit.getId());
        return rows == null || rows == 0;
    }

    /** One message for the combined topics: AmcConfigurations + ScheduledVisit + AssetAmcs. */
    static Map<String, Object> message(RequestInfo requestInfo, List<ActivationPlan> plans) {
        List<AmcConfiguration> configs = new ArrayList<>();
        List<ScheduledVisit> visits = new ArrayList<>();
        List<AssetAmc> links = new ArrayList<>();
        for (ActivationPlan p : plans) {
            configs.add(p.configuration());
            visits.add(p.firstVisit());
            links.add(p.assetAmc());
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("AmcConfigurations", configs);
        body.put("ScheduledVisit", visits);
        body.put("AssetAmcs", links);
        return body;
    }

    private AmcConfiguration loadRunning(String tenantId, String activityFacilityId) {
        AmcConfigurationSearchCriteria criteria = AmcConfigurationSearchCriteria.builder()
                .tenantId(tenantId)
                .activityFacilityIds(List.of(activityFacilityId))
                .statuses(List.of(STATUS_PENDING_ACTIVATION, STATUS_ACTIVE))
                .build();
        AmcConfigurationSearchRequest request = AmcConfigurationSearchRequest.builder().searchCriteria(criteria).build();
        List<AmcConfiguration> found = configurationRepository.getAmcConfiguration(request, 10, 0, tenantId, false, null);
        return found == null || found.isEmpty() ? null : found.get(0);
    }

    private long approvalDate(String tenantId, String activityFacilityId, RequestInfo caller) {
        InstallationRow row = installationRows.findByIds(List.of(activityFacilityId), tenantId, caller).get(activityFacilityId);
        return row != null && row.isApproved() ? row.completedAt() : 0L;
    }

    private AuditDetails audit(RequestInfo caller) {
        String by = caller != null && caller.getUserInfo() != null && caller.getUserInfo().getUuid() != null
                ? caller.getUserInfo().getUuid() : systemUser.user().getUuid();
        return util.getAuditDetails(by, null, true);
    }
}
