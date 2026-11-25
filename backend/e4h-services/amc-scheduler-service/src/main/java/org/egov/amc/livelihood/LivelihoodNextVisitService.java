package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.util.AmcConfigurationServiceUtil;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationSearchCriteria;
import org.egov.amc.web.models.AmcConfigurationSearchRequest;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_ACTIVE;
import static org.egov.amc.livelihood.LivelihoodAmc.istDay;

/**
 * Lazy next visit (LLD §6.3): once visit n's code is verified for the first time, visit n+1 is created,
 * due = 00:00 IST of the First Submission Date's day + frequency months. None after the last visit.
 * Same shape as activation: fixed visit id, workflow SCHEDULE first (system user), then the row; a repeat writes nothing.
 */
@Slf4j
@Service
public class LivelihoodNextVisitService {

    /** Finds ACTIVE AMCs whose highest live visit was finally submitted, is below the total, and has no successor. */
    static final String MISSING_NEXT_VISITS_SQL =
            "SELECT v.amc_configuration_id, v.visit_number, v.first_submission_date"
                    + " FROM scheduled_visits v JOIN amc_configuration c ON c.id = v.amc_configuration_id"
                    + " WHERE c.tenant_id = ? AND c.is_active AND c.status = 'ACTIVE' AND c.activity_facility_id IS NOT NULL"
                    + " AND c.visit_frequency_months > 0"
                    + " AND v.is_active AND v.first_submission_date IS NOT NULL AND v.first_submission_date > 0"
                    + " AND v.visit_number < c.duration_months / c.visit_frequency_months"
                    + " AND v.visit_number = (SELECT max(v2.visit_number) FROM scheduled_visits v2"
                    + "   WHERE v2.amc_configuration_id = c.id AND v2.is_active)";

    private final AMCServiceConfiguration config;
    private final AmcConfigurationRepository configurationRepository;
    private final LivelihoodActivationService activation;
    private final SystemUserProvider systemUser;
    private final AmcConfigurationServiceUtil util;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;

    public LivelihoodNextVisitService(AMCServiceConfiguration config, AmcConfigurationRepository configurationRepository,
                                      LivelihoodActivationService activation, SystemUserProvider systemUser,
                                      AmcConfigurationServiceUtil util, Producer producer, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.configurationRepository = configurationRepository;
        this.activation = activation;
        this.systemUser = systemUser;
        this.util = util;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Due day of visit n+1: IST day of visit n's First Submission Date + frequency (month end clamped). */
    public static long nextDueDay(long firstSubmissionDate, int frequencyMonths) {
        return AmcSchedule.plusMonths(AmcSchedule.startOfDay(firstSubmissionDate), frequencyMonths);
    }

    /** null when visit n is the last one (or the configuration is not usable). */
    public static Integer nextVisitNumber(AmcConfiguration cfg, int visitNumber) {
        if (cfg == null || cfg.getDurationMonths() == null || cfg.getVisitFrequencyMonths() == null || cfg.getVisitFrequencyMonths() <= 0) {
            return null;
        }
        int total = AmcSchedule.totalVisits(cfg.getDurationMonths(), cfg.getVisitFrequencyMonths());
        return visitNumber < total ? visitNumber + 1 : null;
    }

    /**
     * Creates visit n+1 after visit n's first code verification. Returns the new visit, or null when none is due
     * (last visit, AMC not ACTIVE, lazy generation off) or it already existed.
     */
    public ScheduledVisit createAfter(AmcConfiguration cfg, int visitNumber, long firstSubmissionDate, RequestInfo caller) {
        if (!config.isLazyGenerationEnabled()) {
            log.info("Lazy next visit off (amc.livelihood.lazy.generation.enabled=false); AMC {}", cfg != null ? cfg.getId() : null);
            return null;
        }
        if (cfg == null || !STATUS_ACTIVE.equals(cfg.getStatus()) || !Boolean.TRUE.equals(cfg.getIsActive())) {
            log.info("No next visit: AMC {} is not ACTIVE", cfg != null ? cfg.getId() : null);
            return null;
        }
        Integer next = nextVisitNumber(cfg, visitNumber);
        if (next == null) {
            log.info("No next visit: visit {} is the last of AMC {}", visitNumber, cfg.getId());
            return null;
        }
        return createVisit(cfg, next, nextDueDay(firstSubmissionDate, cfg.getVisitFrequencyMonths()), caller);
    }

    /** Re-activates a visit an earlier edit removed (same fixed id): due date and reminder reset (review A3). */
    static final String REACTIVATE_SQL = "UPDATE scheduled_visits SET is_active = true, scheduled_date = ?, reminder_sent_at = NULL,"
            + " last_modified_by = ?, last_modified_time = ? WHERE id = ? AND is_active = false";

    /**
     * Visit n of an AMC (fixed id): a removed one with that id is brought back; otherwise SCHEDULE first (system user),
     * then the row. Returns the visit, or null when it already existed (live).
     */
    public ScheduledVisit createVisit(AmcConfiguration cfg, int visitNumber, long due, RequestInfo caller) {
        String by = caller != null && caller.getUserInfo() != null ? caller.getUserInfo().getUuid() : systemUser.user().getUuid();
        ScheduledVisit visit = ActivationPlan.visit(cfg, visitNumber, due, util.getAuditDetails(by, null, true));
        int reactivated = jdbcTemplate.update(REACTIVATE_SQL, due, by, System.currentTimeMillis(), visit.getId());
        if (reactivated > 0) {
            log.info("Brought back removed visit {} of AMC {}, due {}", visitNumber, cfg.getId(), istDay(due));
            return visit;
        }
        RequestInfo sys = systemUser.requestInfo();
        if (!activation.scheduleIfNeeded(visit, sys)) {
            log.info("Visit {} of AMC {} already exists", visitNumber, cfg.getId());
            return null;
        }
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("RequestInfo", sys);
        message.put("ScheduledVisit", List.of(visit));
        producer.push(config.getSaveScheduledVisitTopic(), message);
        log.info("Created visit {} of AMC {}, due {}", visitNumber, cfg.getId(), istDay(due));
        return visit;
    }

    /** By hand only (LLD §6.3): creates every next visit a failure left out. Returns how many were created. */
    public int createMissing(String tenantId, RequestInfo caller) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(MISSING_NEXT_VISITS_SQL, tenantId);
        int created = 0;
        for (Map<String, Object> r : rows) {
            String cfgId = (String) r.get("amc_configuration_id");
            AmcConfiguration cfg = load(cfgId, tenantId);
            int n = ((Number) r.get("visit_number")).intValue();
            long first = ((Number) r.get("first_submission_date")).longValue();
            try {
                if (createAfter(cfg, n, first, caller) != null) {
                    created++;
                }
            } catch (RuntimeException e) {
                log.error("Could not create the visit after visit {} of AMC {}", n, cfgId, e);
            }
        }
        log.info("_create-missing-visits: {} candidate(s), {} created", rows.size(), created);
        return created;
    }

    public AmcConfiguration load(String configurationId, String tenantId) {
        AmcConfigurationSearchRequest request = AmcConfigurationSearchRequest.builder()
                .searchCriteria(AmcConfigurationSearchCriteria.builder().tenantId(tenantId).ids(List.of(configurationId)).build())
                .build();
        List<AmcConfiguration> found = configurationRepository.getAmcConfiguration(request, 1, 0, tenantId, false, null);
        return found == null || found.isEmpty() ? null : found.get(0);
    }
}
