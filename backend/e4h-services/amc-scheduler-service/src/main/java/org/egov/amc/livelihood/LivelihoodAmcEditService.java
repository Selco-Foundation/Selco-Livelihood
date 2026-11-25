package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.livelihood.LivelihoodAmcEditPlanner.EditPlan;
import org.egov.amc.livelihood.LivelihoodAmcEditPlanner.VisitFact;
import org.egov.amc.repository.AmcConfigurationRepository;
import org.egov.amc.repository.AssetAmcRepository;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationRequest;
import org.egov.amc.web.models.AmcConfigurationSearchCriteria;
import org.egov.amc.web.models.AmcConfigurationSearchRequest;
import org.egov.amc.web.models.AssetAmc;
import org.egov.amc.web.models.AssetAmcSearchCriteria;
import org.egov.amc.web.models.AssetAmcSearchRequest;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.egov.tracer.model.CustomException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_ACTIVE;
import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_CANCELLED;
import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_COMPLETED;

/**
 * Edit AMC ({@code _update}) and turning AMC off ({@code _delete}) for Livelihood (LLD §6.5). All rows are checked
 * first, one error per failing row, and nothing is written if any row fails. The rules live in
 * {@link LivelihoodAmcEditPlanner}; this loads the rows and applies the plan.
 */
@Slf4j
@Service
public class LivelihoodAmcEditService {

    static final String VISITS_SQL = "SELECT id, amc_configuration_id, visit_number, status, first_submission_date, scheduled_date"
            + " FROM scheduled_visits WHERE is_active AND amc_configuration_id = ANY (?)";
    /** Targeted re-date (review A8): never overwrites a submit or code step landing at the same moment. */
    static final String REDATE_SQL = "UPDATE scheduled_visits SET scheduled_date = ?, reminder_sent_at = NULL, last_modified_by = ?,"
            + " last_modified_time = ? WHERE id = ? AND is_active AND (first_submission_date IS NULL OR first_submission_date = 0)";
    public static final String ASSET_AMC_INACTIVE = "INACTIVE";

    private final AMCServiceConfiguration config;
    private final AmcConfigurationRepository configurationRepository;
    private final AssetAmcRepository assetAmcRepository;
    private final AmcMdmsOptions mdmsOptions;
    private final InstallationRowClient installationRows;
    private final LivelihoodNextVisitService nextVisits;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;

    public LivelihoodAmcEditService(AMCServiceConfiguration config, AmcConfigurationRepository configurationRepository,
                                    AssetAmcRepository assetAmcRepository, AmcMdmsOptions mdmsOptions,
                                    InstallationRowClient installationRows, LivelihoodNextVisitService nextVisits,
                                    Producer producer, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.configurationRepository = configurationRepository;
        this.assetAmcRepository = assetAmcRepository;
        this.mdmsOptions = mdmsOptions;
        this.installationRows = installationRows;
        this.nextVisits = nextVisits;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    // ---- Edit AMC -------------------------------------------------------------------------------------

    public List<AmcConfiguration> update(AmcConfigurationRequest request) {
        List<AmcConfiguration> rows = rows(request);
        RequestInfo ri = request.getRequestInfo();
        String tenantId = tenant(rows);
        Map<String, AmcConfiguration> stored = load(rows, tenantId);
        Map<String, List<VisitFact>> visits = visits(stored.keySet());
        AmcMdmsOptions.Options options = mdmsOptions.load(tenantId, ri);
        Map<String, InstallationRow> installs = installationRows.findByIds(stored.values().stream()
                .map(AmcConfiguration::getActivityFacilityId).filter(java.util.Objects::nonNull).distinct().toList(), tenantId, ri);

        List<RowError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            AmcConfiguration req = rows.get(i);
            AmcConfiguration cfg = stored.get(req.getId());
            InstallationRow row = cfg == null || cfg.getActivityFacilityId() == null ? null : installs.get(cfg.getActivityFacilityId());
            errors.addAll(LivelihoodAmcEditPlanner.check(i, req, cfg, visits.getOrDefault(req.getId(), List.of()), options,
                    row == null ? 0L : row.completedAt()));
        }
        if (!errors.isEmpty()) {
            throw LivelihoodAmcCreateService.toException(errors);
        }

        long now = System.currentTimeMillis();
        String by = uuid(ri);
        List<AmcConfiguration> changed = new ArrayList<>();
        List<AssetAmc> links = new ArrayList<>();
        List<ScheduledVisit> removals = new ArrayList<>();
        List<Runnable> afterSave = new ArrayList<>();
        for (AmcConfiguration req : rows) {
            AmcConfiguration cfg = stored.get(req.getId());
            EditPlan plan = LivelihoodAmcEditPlanner.plan(req, cfg, visits.getOrDefault(cfg.getId(), List.of()));
            if (plan.completeNow()) {
                cfg.setStatus(STATUS_COMPLETED);
            }
            cfg.setAuditDetails(LivelihoodCompletionService.touched(cfg.getAuditDetails(), by, now));
            changed.add(cfg);
            if (STATUS_ACTIVE.equals(cfg.getStatus()) || plan.completeNow()) {
                links.addAll(redatedLinks(cfg, plan.completeNow(), by, now));
            }
            if (plan.redateVisitId() != null) {
                afterSave.add(() -> jdbcTemplate.update(REDATE_SQL, plan.redateTo(), by, now, plan.redateVisitId()));
            }
            if (plan.removeVisitId() != null) {
                removals.add(removal(plan.removeVisitId(), cfg.getTenantId(), by, now));
            }
            if (plan.createVisitNumber() != null) {
                afterSave.add(() -> nextVisits.createVisit(cfg, plan.createVisitNumber(), plan.createVisitDue(), ri));
            }
            log.info("Edit AMC {}: {} months every {}, start {}, end {}; redate={} remove={} create={} complete={}", cfg.getId(),
                    cfg.getDurationMonths(), cfg.getVisitFrequencyMonths(), cfg.getConfigurationStartDate(), cfg.getConfigurationEndDate(),
                    plan.redateVisitId(), plan.removeVisitId(), plan.createVisitNumber(), plan.completeNow());
        }
        LivelihoodCompletionService.pushConfigUpdate(producer, config.getUpdateAmcConfigurationTopic(), ri, changed);
        if (!links.isEmpty()) {
            producer.push(config.getUpdateAssetAmcTopic(), message(ri, "AssetAmcs", links));
        }
        if (!removals.isEmpty()) {
            producer.push(config.getDeleteScheduledVisitTopic(), message(ri, "ScheduledVisit", removals));
        }
        afterSave.forEach(Runnable::run);
        return changed;
    }

    // ---- Turning AMC off ------------------------------------------------------------------------------

    public List<AmcConfiguration> turnOff(AmcConfigurationRequest request) {
        List<AmcConfiguration> rows = rows(request);
        RequestInfo ri = request.getRequestInfo();
        String tenantId = tenant(rows);
        Map<String, AmcConfiguration> stored = load(rows, tenantId);
        List<RowError> errors = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            errors.addAll(LivelihoodAmcEditPlanner.checkTurnOff(i, rows.get(i).getId(), stored.get(rows.get(i).getId())));
        }
        if (!errors.isEmpty()) {
            throw LivelihoodAmcCreateService.toException(errors);
        }
        Map<String, List<VisitFact>> visits = visits(stored.keySet());
        long now = System.currentTimeMillis();
        long today = LivelihoodAmc.startOfIstDay(LivelihoodAmc.istDay(now));
        String by = uuid(ri);
        List<AmcConfiguration> cancelled = new ArrayList<>();
        List<AssetAmc> links = new ArrayList<>();
        List<ScheduledVisit> removals = new ArrayList<>();
        for (AmcConfiguration req : rows) {
            AmcConfiguration cfg = stored.get(req.getId());
            cfg.setStatus(STATUS_CANCELLED);
            cfg.setIsActive(false);
            cfg.setAuditDetails(LivelihoodCompletionService.touched(cfg.getAuditDetails(), by, now));
            cancelled.add(cfg);
            for (AssetAmc a : activeLinks(cfg)) {
                a.setStatus(ASSET_AMC_INACTIVE);
                a.setAmcEndDate(today);
                a.setAuditDetails(LivelihoodCompletionService.touched(a.getAuditDetails(), by, now));
                links.add(a);
            }
            List<String> gone = LivelihoodAmcEditPlanner.visitsToRemoveOnTurnOff(visits.getOrDefault(cfg.getId(), List.of()));
            gone.forEach(id -> removals.add(removal(id, cfg.getTenantId(), by, now)));
            log.info("Turned off AMC {}: {} unfinished visit(s) removed, {} asset link(s) inactive", cfg.getId(), gone.size(), links.size());
        }
        producer.push(config.getDeleteAmcConfigurationTopic(), message(ri, "AmcConfigurations", cancelled));
        if (!links.isEmpty()) {
            producer.push(config.getUpdateAssetAmcTopic(), message(ri, "AssetAmcs", links));
        }
        if (!removals.isEmpty()) {
            producer.push(config.getDeleteScheduledVisitTopic(), message(ri, "ScheduledVisit", removals));
        }
        return cancelled;
    }

    // ---- helpers --------------------------------------------------------------------------------------

    private static List<AmcConfiguration> rows(AmcConfigurationRequest request) {
        if (request.getAmcConfigurations() == null || request.getAmcConfigurations().isEmpty()) {
            throw new CustomException("AmcConfiguration", "AMC configurations are mandatory");
        }
        for (AmcConfiguration c : request.getAmcConfigurations()) {
            if (c.getId() == null || c.getId().isBlank()) {
                throw new CustomException(LivelihoodAmcEditPlanner.AMC_NOT_FOUND, "id is required for every row");
            }
        }
        return request.getAmcConfigurations();
    }

    private String tenant(List<AmcConfiguration> rows) {
        String t = rows.get(0).getTenantId();
        return t == null ? config.getStateTenantId() : t;
    }

    private Map<String, AmcConfiguration> load(List<AmcConfiguration> rows, String tenantId) {
        List<String> ids = rows.stream().map(AmcConfiguration::getId).distinct().toList();
        AmcConfigurationSearchRequest search = AmcConfigurationSearchRequest.builder()
                .searchCriteria(AmcConfigurationSearchCriteria.builder().tenantId(tenantId).ids(ids).build()).build();
        List<AmcConfiguration> found = configurationRepository.getAmcConfiguration(search, ids.size(), 0, tenantId, false, null);
        return found.stream().collect(Collectors.toMap(AmcConfiguration::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
    }

    private Map<String, List<VisitFact>> visits(java.util.Collection<String> configIds) {
        Map<String, List<VisitFact>> out = new HashMap<>();
        if (configIds.isEmpty()) {
            return out;
        }
        jdbcTemplate.query(con -> {
            var ps = con.prepareStatement(VISITS_SQL);
            ps.setArray(1, con.createArrayOf("varchar", configIds.toArray()));
            return ps;
        }, (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
            long first = rs.getLong("first_submission_date");
            long due = rs.getLong("scheduled_date");
            out.computeIfAbsent(rs.getString("amc_configuration_id"), k -> new ArrayList<>()).add(new VisitFact(
                    rs.getString("id"), rs.getInt("visit_number"), rs.getString("status"), first == 0 ? null : first, due == 0 ? null : due));
        });
        return out;
    }

    private List<AssetAmc> activeLinks(AmcConfiguration cfg) {
        AssetAmcSearchRequest search = AssetAmcSearchRequest.builder()
                .searchCriteria(AssetAmcSearchCriteria.builder().tenantId(cfg.getTenantId()).amcConfigurationIds(List.of(cfg.getId())).build())
                .build();
        return assetAmcRepository.getAssetAmc(search, 100, 0, cfg.getTenantId(), false, null).stream()
                .filter(a -> STATUS_ACTIVE.equals(a.getStatus())).toList();
    }

    /** asset_amc follows the AMC dates (full row); on completion it expires today. */
    private List<AssetAmc> redatedLinks(AmcConfiguration cfg, boolean complete, String by, long now) {
        List<AssetAmc> out = new ArrayList<>();
        for (AssetAmc a : activeLinks(cfg)) {
            if (complete) {
                a.setStatus(LivelihoodCompletionService.ASSET_AMC_EXPIRED);
                a.setAmcEndDate(LivelihoodAmc.startOfIstDay(LivelihoodAmc.istDay(now)));
            } else {
                a.setAmcStartDate(cfg.getConfigurationStartDate());
                a.setAmcEndDate(cfg.getConfigurationEndDate());
            }
            a.setAuditDetails(LivelihoodCompletionService.touched(a.getAuditDetails(), by, now));
            out.add(a);
        }
        return out;
    }

    private static ScheduledVisit removal(String visitId, String tenantId, String by, long now) {
        return ScheduledVisit.builder().id(visitId).tenantId(tenantId)
                .auditDetails(AuditDetails.builder().lastModifiedBy(by).lastModifiedTime(now).build()).build();
    }

    private static String uuid(RequestInfo ri) {
        return ri != null && ri.getUserInfo() != null ? ri.getUserInfo().getUuid() : null;
    }

    private static Map<String, Object> message(RequestInfo ri, String key, List<?> rows) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("RequestInfo", ri);
        m.put(key, rows);
        return m;
    }
}
