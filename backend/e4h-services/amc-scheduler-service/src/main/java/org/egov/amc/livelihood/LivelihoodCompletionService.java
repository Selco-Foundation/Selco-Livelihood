package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.repository.AssetAmcRepository;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AssetAmc;
import org.egov.amc.web.models.AssetAmcSearchCriteria;
import org.egov.amc.web.models.AssetAmcSearchRequest;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.common.contract.models.AuditDetails;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_ACTIVE;
import static org.egov.amc.livelihood.LivelihoodAmc.STATUS_COMPLETED;

/**
 * AMC completion on approve (LLD §6.8, step 14): when every visit 1..total of an ACTIVE AMC is approved, the
 * configuration becomes COMPLETED and its ACTIVE asset_amc links EXPIRED with end date = today (00:00 IST).
 * Both updates are full-row, so the rows are loaded first.
 */
@Slf4j
@Service
public class LivelihoodCompletionService {

    public static final String ASSET_AMC_EXPIRED = "EXPIRED";

    /** Other live visits of the AMC already approved, within 1..total. */
    static final String APPROVED_OTHERS_SQL = "SELECT count(*) FROM scheduled_visits WHERE amc_configuration_id = ?"
            + " AND is_active AND status = 'APPROVED' AND id <> ? AND visit_number BETWEEN 1 AND ?";

    private final AMCServiceConfiguration config;
    private final LivelihoodNextVisitService configurations;
    private final AssetAmcRepository assetAmcRepository;
    private final Producer producer;
    private final JdbcTemplate jdbcTemplate;

    public LivelihoodCompletionService(AMCServiceConfiguration config, LivelihoodNextVisitService configurations,
                                       AssetAmcRepository assetAmcRepository, Producer producer, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.configurations = configurations;
        this.assetAmcRepository = assetAmcRepository;
        this.producer = producer;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** @return true when the AMC was completed now */
    public boolean completeIfAllApproved(ScheduledVisit approved, RequestInfo requestInfo) {
        AmcConfiguration cfg = configurations.load(approved.getAmcConfigurationId(), approved.getTenantId());
        if (cfg == null || !STATUS_ACTIVE.equals(cfg.getStatus()) || cfg.getVisitFrequencyMonths() == null
                || cfg.getVisitFrequencyMonths() <= 0 || cfg.getDurationMonths() == null) {
            return false;
        }
        int total = AmcSchedule.totalVisits(cfg.getDurationMonths(), cfg.getVisitFrequencyMonths());
        Integer others = jdbcTemplate.queryForObject(APPROVED_OTHERS_SQL, Integer.class, cfg.getId(), approved.getId(), total);
        if (!LivelihoodReview.allApproved(others == null ? 0 : others, total)) {
            log.info("AMC {}: {} of {} visits approved, not complete", cfg.getId(), (others == null ? 0 : others) + 1, total);
            return false;
        }
        long now = System.currentTimeMillis();
        String by = requestInfo != null && requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getUuid() : null;

        cfg.setStatus(STATUS_COMPLETED);
        cfg.setAuditDetails(touched(cfg.getAuditDetails(), by, now));
        producer.push(config.getUpdateAmcConfigurationTopic(), message(requestInfo, "AmcConfigurations", List.of(cfg)));

        long today = LivelihoodAmc.startOfIstDay(LivelihoodAmc.istDay(now));
        List<AssetAmc> links = new ArrayList<>();
        AssetAmcSearchRequest search = AssetAmcSearchRequest.builder()
                .searchCriteria(AssetAmcSearchCriteria.builder().tenantId(cfg.getTenantId()).amcConfigurationIds(List.of(cfg.getId())).build())
                .build();
        for (AssetAmc a : assetAmcRepository.getAssetAmc(search, 100, 0, cfg.getTenantId(), false, null)) {
            if (STATUS_ACTIVE.equals(a.getStatus())) {
                a.setStatus(ASSET_AMC_EXPIRED);
                a.setAmcEndDate(today);
                a.setAuditDetails(touched(a.getAuditDetails(), by, now));
                links.add(a);
            }
        }
        if (!links.isEmpty()) {
            producer.push(config.getUpdateAssetAmcTopic(), message(requestInfo, "AssetAmcs", links));
        }
        log.info("AMC {} COMPLETED: all {} visits approved; {} asset_amc link(s) expired on {}", cfg.getId(), total,
                links.size(), Instant.ofEpochMilli(today));
        return true;
    }

    static AuditDetails touched(AuditDetails a, String by, long now) {
        return AuditDetails.builder()
                .createdBy(a != null ? a.getCreatedBy() : by)
                .createdTime(a != null ? a.getCreatedTime() : now)
                .lastModifiedBy(by != null ? by : (a != null ? a.getLastModifiedBy() : null))
                .lastModifiedTime(now)
                .build();
    }

    private static Map<String, Object> message(RequestInfo requestInfo, String key, List<?> rows) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("RequestInfo", requestInfo);
        m.put(key, rows);
        return m;
    }
}
