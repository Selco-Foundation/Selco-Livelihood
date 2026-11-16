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
 * <p>Step 2.1 covers rows whose installation is NOT yet approved (status PENDING_ACTIVATION). A row that is
 * already approved is validated fully but then refused with a temporary code until activation lands (2.2).
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

    public LivelihoodAmcCreateService(AMCServiceConfiguration config, InstallationRowClient installationRows,
                                      VendorOrgDirectory vendorOrgs, AmcMdmsOptions mdmsOptions,
                                      AmcConfigurationEnrichment enrichment, JdbcTemplate jdbcTemplate) {
        this.config = config;
        this.installationRows = installationRows;
        this.vendorOrgs = vendorOrgs;
        this.mdmsOptions = mdmsOptions;
        this.enrichment = enrichment;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Validates the batch and replaces each request row with the configuration to save. Throws on any error. */
    public void prepare(AmcConfigurationRequest request) {
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

        List<RowError> approved = new ArrayList<>();
        for (int i = 0; i < configs.size(); i++) {
            InstallationRow row = facts.rows().get(configs.get(i).getActivityFacilityId());
            if (row.isApproved()) {
                approved.add(new RowError(i, row.id(), "activityFacilityId", AMC_APPROVED_ROW_NOT_SUPPORTED_YET,
                        "this installation is already approved; turning AMC on after approval is not available yet"));
            }
        }
        if (!approved.isEmpty()) {
            throw toException(approved);
        }

        List<AmcConfiguration> toSave = new ArrayList<>();
        for (AmcConfiguration in : configs) {
            InstallationRow row = facts.rows().get(in.getActivityFacilityId());
            AmcConfiguration out = buildPending(in, row, tenantId);
            enrichment.enrichAmcConfigurationOnCreate(out, requestInfo);
            toSave.add(out);
        }
        request.setAmcConfigurations(toSave);
        log.info("Livelihood AMC create: {} configuration(s) PENDING_ACTIVATION", toSave.size());
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
