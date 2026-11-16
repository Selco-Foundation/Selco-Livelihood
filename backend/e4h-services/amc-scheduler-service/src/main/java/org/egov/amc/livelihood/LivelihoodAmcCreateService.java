package org.egov.amc.livelihood;

import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.InstallationRowClient.InstallationRow;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.Facts;
import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.service.enrichment.AmcConfigurationEnrichment;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;
import org.egov.amc.web.models.AmcConfigurationRequest;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static org.egov.amc.livelihood.LivelihoodAmc.*;

/**
 * Livelihood configuration/_create (LLD 07 §6.3): one AMC per SOLAR installation row, saved with frequency
 * and duration, one named AMC field staff. Validates the whole batch before anything is produced and turns
 * each row into the configuration E4H's save path persists (save-amc-configuration).
 *
 * <p>A row whose installation is not yet approved is saved PENDING_ACTIVATION (save-amc-configuration). A row
 * that is already approved is saved ACTIVE straight away with the PM's start date, visit 1 and the asset_amc
 * link, in one message (save-active-amc-configuration); without its SOLAR asset it is refused.
 */
@Slf4j
@Service
public class LivelihoodAmcCreateService {

    static final List<Map<String, Object>> SOLAR_ASSET_TYPES = List.of(Map.of("code", "SOLAR", "name", "Solar"));

    private final AMCServiceConfiguration config;
    private final InstallationRowClient installationRows;
    private final VendorOrgDirectory vendorOrgs;
    private final AmcMdmsOptions mdmsOptions;
    private final AmcConfigurationEnrichment enrichment;
    private final JdbcTemplate jdbcTemplate;
    private final SolarAssetClient solarAssets;

    /** The validated batch: rows saved PENDING_ACTIVATION, and rows activated straight away. */
    public record PreparedCreate(List<AmcConfiguration> pending, List<ActivationPlan> active) {
    }

    public LivelihoodAmcCreateService(AMCServiceConfiguration config, InstallationRowClient installationRows,
                                      VendorOrgDirectory vendorOrgs, AmcMdmsOptions mdmsOptions,
                                      AmcConfigurationEnrichment enrichment, JdbcTemplate jdbcTemplate,
                                      SolarAssetClient solarAssets) {
        this.config = config;
        this.installationRows = installationRows;
        this.vendorOrgs = vendorOrgs;
        this.mdmsOptions = mdmsOptions;
        this.enrichment = enrichment;
        this.jdbcTemplate = jdbcTemplate;
        this.solarAssets = solarAssets;
    }

    /**
     * Validates the batch and replaces the request rows with the configurations to save (pending and active,
     * in request order). Throws on any error, before anything is produced.
     */
    public PreparedCreate prepare(AmcConfigurationRequest request) {
        List<AmcConfiguration> configs = request.getAmcConfigurations();
        if (configs == null || configs.isEmpty()) {
            throw new CustomException("AmcConfiguration", "AMC configurations are mandatory");
        }
        RequestInfo requestInfo = request.getRequestInfo();
        String tenantId = config.getStateTenantId();

        Set<String> afIds = configs.stream().map(AmcConfiguration::getActivityFacilityId)
                .filter(s -> s != null && !s.isBlank()).collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        Set<String> orgIds = configs.stream().map(AmcConfiguration::getVendorOrgId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<String> userIds = configs.stream().map(AmcConfiguration::getAmcFieldStaffId).filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Facts facts = new Facts(tenantId,
                installationRows.findByIds(afIds, tenantId, requestInfo),
                runningAmcRows(afIds, tenantId),
                vendorOrgs.findOrgs(orgIds, tenantId, requestInfo),
                vendorOrgs.findMembers(orgIds, userIds, tenantId, requestInfo),
                mdmsOptions.load(tenantId, requestInfo));

        List<RowError> errors = LivelihoodAmcCreateValidator.validate(configs, facts);
        if (!errors.isEmpty()) {
            throw toException(errors);
        }

        // Already-approved rows start straight away, so they need their SOLAR asset now (never activate without it).
        Map<String, String> solarAssetByRow = new LinkedHashMap<>();
        List<RowError> missingAsset = new ArrayList<>();
        for (int i = 0; i < configs.size(); i++) {
            InstallationRow row = facts.rows().get(configs.get(i).getActivityFacilityId());
            if (row.isApproved()) {
                String assetId = solarAssets.findSolarAssetId(row.id(), tenantId, requestInfo);
                if (assetId == null) {
                    missingAsset.add(new RowError(i, row.id(), "activityFacilityId", AMC_SOLAR_ASSET_NOT_FOUND,
                            "the installation is approved but has no SOLAR asset"));
                } else {
                    solarAssetByRow.put(row.id(), assetId);
                }
            }
        }
        if (!missingAsset.isEmpty()) {
            throw toException(missingAsset);
        }

        List<AmcConfiguration> all = new ArrayList<>();
        List<AmcConfiguration> pending = new ArrayList<>();
        List<ActivationPlan> active = new ArrayList<>();
        for (AmcConfiguration in : configs) {
            InstallationRow row = facts.rows().get(in.getActivityFacilityId());
            AmcConfiguration out = buildPending(in, row, tenantId);
            enrichment.enrichAmcConfigurationOnCreate(out, requestInfo);
            if (row.isApproved()) {
                active.add(ActivationPlan.of(out, AmcSchedule.startOfDay(in.getConfigurationStartDate()),
                        solarAssetByRow.get(row.id()), out.getAuditDetails()));
            } else {
                pending.add(out);
            }
            all.add(out);
        }
        request.setAmcConfigurations(all);
        log.info("Livelihood AMC create: {} PENDING_ACTIVATION, {} ACTIVE", pending.size(), active.size());
        return new PreparedCreate(pending, active);
    }

    /** The configuration to persist for a not-yet-approved row. Everything except the PM's choices is server-set. */
    static AmcConfiguration buildPending(AmcConfiguration in, InstallationRow row, String tenantId) {
        AmcConfigurationAssignment assignment = AmcConfigurationAssignment.builder()
                .tenantId(tenantId)
                .assignedUser(in.getAmcFieldStaffId().trim())
                .isActive(true)
                .build();
        List<AmcConfigurationAssignment> assignments = new ArrayList<>();
        assignments.add(assignment);
        return AmcConfiguration.builder()
                .tenantId(tenantId)
                .activityFacilityId(row.id())
                .facilityId(row.facilityId())
                .projectId(row.projectId())
                .vendorId(in.getVendorOrgId().trim())
                .vendorOrgId(in.getVendorOrgId().trim())
                .amcFieldStaffId(in.getAmcFieldStaffId().trim())
                .assetTypes(new ArrayList<>(SOLAR_ASSET_TYPES))
                .durationMonths(in.getDurationMonths())
                .visitFrequencyMonths(in.getVisitFrequencyMonths())
                .configurationStartDate(null)
                .configurationEndDate(null)
                .status(STATUS_PENDING_ACTIVATION)
                .assignments(assignments)
                .build();
    }

    /** Rows that already have a running AMC (PENDING_ACTIVATION or ACTIVE). Read synchronously: the persister is async. */
    Set<String> runningAmcRows(Set<String> afIds, String tenantId) {
        if (afIds.isEmpty()) {
            return Set.of();
        }
        String placeholders = afIds.stream().map(x -> "?").collect(Collectors.joining(","));
        List<Object> args = new ArrayList<>();
        args.add(tenantId);
        args.addAll(afIds);
        List<String> found = jdbcTemplate.queryForList(
                "SELECT activity_facility_id FROM amc_configuration WHERE tenant_id = ? AND is_active"
                        + " AND status IN ('" + STATUS_PENDING_ACTIVATION + "','" + STATUS_ACTIVE + "')"
                        + " AND activity_facility_id IN (" + placeholders + ")",
                String.class, args.toArray());
        return new HashSet<>(found);
    }

    /** All errors in one response; a code that repeats across rows lists every row in its message. */
    static CustomException toException(List<RowError> errors) {
        Map<String, String> byCode = new LinkedHashMap<>();
        for (RowError e : errors) {
            String text = "row " + (e.index() + 1)
                    + (e.activityFacilityId() == null ? "" : " (" + e.activityFacilityId() + ")")
                    + ", " + e.field() + ": " + e.message();
            byCode.merge(e.code(), text, (a, b) -> a + "; " + b);
        }
        return new CustomException(byCode);
    }
}
