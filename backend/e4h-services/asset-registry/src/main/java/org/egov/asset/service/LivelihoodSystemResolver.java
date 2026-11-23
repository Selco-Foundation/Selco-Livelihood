package org.egov.asset.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.util.MdmsUtil;
import org.egov.asset.web.models.Asset;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

/**
 * The system type (asset.system) of a Livelihood asset.
 *
 * <p>A type that MDMS asset-registry.SystemSchema lists is kept as sent. Anything else (the app sends
 * SOLAR or LIVELIHOOD, or nothing) is replaced by the system type of the Solution the asset was
 * installed for: asset -> its installation (facility_activities) -> Solution (icc_templates). When that
 * gives nothing, e.g. an asset from the bulk sheet, which has no installation, the value stays as sent.
 * Never fails a request: a lookup that cannot be made leaves the value as it is.
 */
@Component
@Slf4j
public class LivelihoodSystemResolver {

    static final long CACHE_MILLIS = 5 * 60 * 1000L;

    static final String SOLUTION_SYSTEM_TYPE_SQL = "SELECT t.system_type FROM facility_activities fa"
            + " JOIN icc_templates t ON t.tenant_id = fa.tenant_id AND t.solution_code = fa.solution_id"
            + " WHERE fa.id = ? AND fa.tenant_id = ?";

    private final MdmsUtil mdmsUtil;

    private final JdbcTemplate jdbcTemplate;

    private volatile Set<String> systemCodes = Set.of();

    private volatile long systemCodesReadAt;

    public LivelihoodSystemResolver(MdmsUtil mdmsUtil, JdbcTemplate jdbcTemplate) {
        this.mdmsUtil = mdmsUtil;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** The asset and, when it has any, its units: they always get the same value. */
    public void resolveWithUnits(Asset asset, RequestInfo requestInfo) {
        resolve(asset, requestInfo);
        if (asset.getChildren() != null) {
            asset.getChildren().stream().filter(java.util.Objects::nonNull)
                    .forEach(unit -> unit.setSystem(asset.getSystem()));
        }
    }

    public void resolve(Asset asset, RequestInfo requestInfo) {
        if (listed(asset.getSystem(), requestInfo, asset.getTenantId())) {
            return;
        }
        String fromSolution = solutionSystemType(asset.getActivityFacilityID(), asset.getTenantId());
        if (fromSolution != null) {
            asset.setSystem(fromSolution);
        }
    }

    private boolean listed(String system, RequestInfo requestInfo, String tenantId) {
        return StringUtils.isNotBlank(system) && systemCodes(requestInfo, tenantId).contains(system.trim());
    }

    private Set<String> systemCodes(RequestInfo requestInfo, String tenantId) {
        if (!systemCodes.isEmpty() && System.currentTimeMillis() - systemCodesReadAt < CACHE_MILLIS) {
            return systemCodes;
        }
        try {
            systemCodes = mdmsUtil.getSystemCodes(requestInfo, tenantId);
            systemCodesReadAt = System.currentTimeMillis();
        } catch (RuntimeException e) {
            log.warn("System types not read from MDMS, the Solution's is used: {}", e.getMessage());
            return Set.of();
        }
        return systemCodes;
    }

    private String solutionSystemType(String activityFacilityId, String tenantId) {
        if (StringUtils.isBlank(activityFacilityId)) {
            return null;
        }
        try {
            List<String> types = jdbcTemplate.queryForList(SOLUTION_SYSTEM_TYPE_SQL, String.class, activityFacilityId, tenantId);
            return types.stream().filter(StringUtils::isNotBlank).map(String::trim).findFirst().orElse(null);
        } catch (RuntimeException e) {
            log.warn("System type of the Solution not read for installation {}: {}", activityFacilityId, e.getMessage());
            return null;
        }
    }
}
