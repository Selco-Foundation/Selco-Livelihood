package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.FieldStaffChangePlanner.RowPlan;
import org.egov.amc.livelihood.FieldStaffChangePlanner.Update;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.repository.ScheduledVisitRepository;
import org.egov.amc.service.VisitWorkflowService;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationSearchCriteria;
import org.egov.amc.web.models.AmcConfigurationSearchRequest;
import org.egov.amc.web.models.ProcessInstance;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitSearchCriteria;
import org.egov.amc.web.models.ScheduledVisitSearchRequest;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.egov.tracer.model.CustomException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_ACTIVE;
import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_COMPLETED;
import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_PENDING_ACTIVATION;

/**
 * {@code POST /v1/configuration/field-staff/_update} (LLD §6.6). Batch, all-or-nothing for the checks; then the
 * workflow resets for every row that needs one, then all writes. A reset can't be rolled back, so a retry
 * recognises a half-done row (workflow already SCHEDULED, visit still PENDING_OTP_APPROVAL) and only completes
 * its writes. Visits are loaded as the system user (on someone else's behalf, review A18).
 */
@Slf4j
@Service
public class FieldStaffChangeService {

    static final String CLEAR_NON_FUNCTIONAL_SQL = "UPDATE scheduled_visits SET non_functional_notified_at = NULL WHERE id = ?";

    private final AMCServiceConfiguration config;
    private final AmcConfigurationRepository configurationRepository;
    private final ScheduledVisitRepository visitRepository;
    private final VendorOrgDirectory vendors;
    private final VisitWorkflowService workflow;
    private final SystemUserProvider systemUser;
    private final AmcConfigurationServiceUtil util;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;
    private final ReminderService reminders;

    public FieldStaffChangeService(AMCServiceConfiguration config, AmcConfigurationRepository configurationRepository,
                                   ScheduledVisitRepository visitRepository, VendorOrgDirectory vendors, VisitWorkflowService workflow,
                                   SystemUserProvider systemUser, AmcConfigurationServiceUtil util, Producer producer, JdbcTemplate jdbcTemplate,
                                   ReminderService reminders) {
        this.reminders = reminders;
        this.config = config;
        this.configurationRepository = configurationRepository;
        this.visitRepository = visitRepository;
        this.vendors = vendors;
        this.workflow = workflow;
        this.systemUser = systemUser;
        this.util = util;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> change(List<Update> updates, RequestInfo caller) {
        if (updates == null || updates.isEmpty()) {
            throw new CustomException("AmcFieldStaffUpdates", "AmcFieldStaffUpdates are mandatory");
        }
        String tenantId = updates.get(0).tenantId() == null ? config.getStateTenantId() : updates.get(0).tenantId();
        RequestInfo sys = systemUser.requestInfo();

        // load: configs per row, their visits, orgs and memberships (one vendor-registry call each)
        Map<String, AmcConfiguration> running = new HashMap<>();
        Set<String> completedRows = new HashSet<>();
        loadConfigs(updates, tenantId, running, completedRows);
        Map<String, List<ScheduledVisit>> visits = loadVisits(running.values(), tenantId, sys);
        Set<String> orgIds = new LinkedHashSet<>();
        Set<String> userIds = new LinkedHashSet<>();
        for (Update u : updates) {
            AmcConfiguration cfg = running.get(u.activityFacilityId());
            if (u.vendorOrgId() != null && !u.vendorOrgId().isBlank()) {
                orgIds.add(u.vendorOrgId());
            } else if (cfg != null && cfg.getVendorId() != null) {
                orgIds.add(cfg.getVendorId());
            }
            add(userIds, u.fieldStaffUserId());
            if (u.rejectedVisitFieldStaffUserId() != null && cfg != null) {
                add(userIds, u.rejectedVisitFieldStaffUserId());
                visits.getOrDefault(cfg.getId(), List.of()).forEach(v -> add(orgIds, v.getVendorId()));
            }
        }
        Map<String, VendorOrgDirectory.VendorOrg> orgs = vendors.findOrgs(orgIds, tenantId, caller);
        Map<String, VendorOrgDirectory.OrgMember> members = vendors.findMembers(orgIds, userIds, tenantId, caller);

        // 1. every check first
        List<RowError> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < updates.size(); i++) {
            Update u = updates.get(i);
            AmcConfiguration cfg = running.get(u.activityFacilityId());
            errors.addAll(FieldStaffChangePlanner.check(i, u, cfg, completedRows.contains(u.activityFacilityId()),
                    cfg == null ? List.of() : visits.getOrDefault(cfg.getId(), List.of()), orgs, members, seen));
        }
        if (!errors.isEmpty()) {
            throw LivelihoodAmcCreateService.toException(errors);
        }

        // plans
        AuditDetails audit = util.getAuditDetails(caller.getUserInfo().getUuid(), null, true);
        List<Map<String, Object>> result = new ArrayList<>();
        List<RowPlan> plans = new ArrayList<>();
        List<ScheduledVisit> remindAgain = new ArrayList<>();
        Map<String, String> remindTo = new HashMap<>();
        for (Update u : updates) {
            AmcConfiguration cfg = running.get(u.activityFacilityId());
            String staffBefore = LivelihoodAmcEditPlanner.activeFieldStaff(cfg);
            RowPlan p = FieldStaffChangePlanner.plan(u, cfg, visits.getOrDefault(cfg.getId(), List.of()), audit);
            plans.add(p);
            for (ScheduledVisit v : FieldStaffChangePlanner.reminderResendCandidates(p, staffBefore, u.fieldStaffUserId())) {
                remindAgain.add(v);
                remindTo.put(v.getId(), u.fieldStaffUserId());
            }
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("activityFacilityId", u.activityFacilityId());
            r.put("amcConfigurationId", cfg.getId());
            r.put("outcome", p.unchanged() ? "UNCHANGED" : "CHANGED");
            r.put("visitsMoved", p.visitUpdates().size());
            r.put("visitsReset", p.resets().size());
            result.add(r);
        }

        // 2. workflow resets (system user); a row already reset by an earlier attempt is not reset again
        for (RowPlan p : plans) {
            for (ScheduledVisit v : p.resets()) {
                if (!alreadyScheduled(v, sys)) {
                    workflow.transitionWorkflow(v, FieldStaffChangePlanner.RESET_FOR_REASSIGNMENT, null, sys,
                            "Vendor org changed: the saved report is discarded and the visit starts again");
                }
            }
        }

        // 3. writes: configs (with assignments: this is their one writer), then open visits (full row with assignments)
        List<AmcConfiguration> configs = plans.stream().filter(p -> !p.unchanged()).map(RowPlan::configuration).toList();
        if (!configs.isEmpty()) {
            long now = System.currentTimeMillis();
            configs.forEach(c -> c.setAuditDetails(LivelihoodCompletionService.touched(c.getAuditDetails(), caller.getUserInfo().getUuid(), now)));
            producer.push(config.getUpdateAmcConfigurationTopic(), message(caller, "AmcConfigurations", configs));
        }
        List<ScheduledVisit> visitRows = new ArrayList<>();
        for (RowPlan p : plans) {
            for (ScheduledVisit v : p.visitUpdates()) {
                v.setAuditDetails(LivelihoodCompletionService.touched(v.getAuditDetails(), caller.getUserInfo().getUuid(), System.currentTimeMillis()));
                visitRows.add(VisitRowCopy.fullRow(v).build());
            }
            for (ScheduledVisit v : p.resets()) {
                jdbcTemplate.update(CLEAR_NON_FUNCTIONAL_SQL, v.getId());
            }
        }
        if (!visitRows.isEmpty()) {
            producer.push(config.getUpdateScheduledVisitTopic(), message(caller, "ScheduledVisit", visitRows));
        }

        // 4. reminder already out with the old person's number: send it again with the new one (never fails the change)
        int resent = 0;
        Map<String, List<ScheduledVisit>> byUser = new LinkedHashMap<>();
        remindAgain.forEach(v -> byUser.computeIfAbsent(remindTo.get(v.getId()), k -> new ArrayList<>()).add(v));
        for (Map.Entry<String, List<ScheduledVisit>> e : byUser.entrySet()) {
            resent += reminders.resendAfterFieldStaffChange(e.getValue(), e.getKey());
        }
        log.info("field-staff/_update: {} row(s), {} changed, {} visit(s) moved, {} reminder(s) resent", updates.size(), configs.size(),
                visitRows.size(), resent);
        return result;
    }

    private boolean alreadyScheduled(ScheduledVisit v, RequestInfo sys) {
        List<ProcessInstance> pis = workflow.getProcessInstanceById(v.getId(), v.getTenantId(), sys);
        return pis != null && !pis.isEmpty() && pis.get(0).getState() != null && "SCHEDULED".equals(pis.get(0).getState().getState());
    }

    private void loadConfigs(List<Update> updates, String tenantId, Map<String, AmcConfiguration> running, Set<String> completedRows) {
        List<String> rows = updates.stream().map(Update::activityFacilityId).filter(r -> r != null && !r.isBlank()).distinct().toList();
        if (rows.isEmpty()) {
            return;
        }
        AmcConfigurationSearchRequest search = AmcConfigurationSearchRequest.builder()
                .searchCriteria(AmcConfigurationSearchCriteria.builder().tenantId(tenantId).activityFacilityIds(rows).build()).build();
        for (AmcConfiguration c : configurationRepository.getAmcConfiguration(search, 100, 0, tenantId, false, null)) {
            if (STATUS_ACTIVE.equals(c.getStatus()) || STATUS_PENDING_ACTIVATION.equals(c.getStatus())) {
                running.put(c.getActivityFacilityId(), c);
            } else if (STATUS_COMPLETED.equals(c.getStatus())) {
                completedRows.add(c.getActivityFacilityId());
            }
        }
    }

    private Map<String, List<ScheduledVisit>> loadVisits(java.util.Collection<AmcConfiguration> configs, String tenantId, RequestInfo sys) {
        Map<String, List<ScheduledVisit>> out = new HashMap<>();
        List<String> ids = configs.stream().map(AmcConfiguration::getId).toList();
        if (ids.isEmpty()) {
            return out;
        }
        ScheduledVisitSearchRequest search = ScheduledVisitSearchRequest.builder().RequestInfo(sys)
                .searchCriteria(ScheduledVisitSearchCriteria.builder().tenantId(tenantId).amcConfigurationIds(ids).build()).build();
        for (ScheduledVisit v : visitRepository.getScheduledVisit(search, 500, 0, tenantId, false, null)) {
            out.computeIfAbsent(v.getAmcConfigurationId(), k -> new ArrayList<>()).add(v);
        }
        return out;
    }

    private static void add(Set<String> set, String value) {
        if (value != null && !value.isBlank()) {
            set.add(value);
        }
    }

    private static Map<String, Object> message(RequestInfo ri, String key, List<?> rows) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("RequestInfo", ri);
        m.put(key, rows);
        return m;
    }
}
