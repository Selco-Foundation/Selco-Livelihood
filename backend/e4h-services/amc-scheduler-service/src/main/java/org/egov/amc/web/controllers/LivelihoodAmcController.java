package org.egov.amc.web.controllers;

import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.livelihood.FieldStaffChangePlanner;
import org.egov.amc.livelihood.FieldStaffChangeService;
import org.egov.amc.livelihood.LivelihoodActivationService;
import org.egov.amc.livelihood.LivelihoodNextVisitService;
import org.egov.amc.web.models.AmcActivationRequest;
import org.egov.amc.web.models.AmcFieldStaffUpdateRequest;
import org.egov.common.contract.models.RequestInfoWrapper;
import org.egov.tracer.model.CustomException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Livelihood activation and repair endpoints (LLD 07 §6.3). Not for screens: no web role; called in-cluster by
 * the installation service on approval ({@code _activate}) and by ops ({@code _activate-pending},
 * {@code _create-missing-visits}).
 */
@RestController
@RequestMapping("/v1/configuration")
public class LivelihoodAmcController {

    private final LivelihoodActivationService activation;
    private final LivelihoodNextVisitService nextVisits;
    private final FieldStaffChangeService fieldStaff;
    private final AMCServiceConfiguration config;

    public LivelihoodAmcController(LivelihoodActivationService activation, LivelihoodNextVisitService nextVisits,
                                   FieldStaffChangeService fieldStaff, AMCServiceConfiguration config) {
        this.activation = activation;
        this.nextVisits = nextVisits;
        this.fieldStaff = fieldStaff;
        this.config = config;
    }

    @RequestMapping(value = "/_activate", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> activate(@RequestBody AmcActivationRequest request) {
        if (request.getActivityFacilityId() == null || request.getActivityFacilityId().isBlank()) {
            throw new CustomException("AMC_INVALID_ACTIVITY_FACILITY", "activityFacilityId is required");
        }
        String tenantId = request.getTenantId() == null ? config.getStateTenantId() : request.getTenantId();
        LivelihoodActivationService.Result r = activation.activate(tenantId, request.getActivityFacilityId(),
                request.getApprovedAt(), request.getRequestInfo());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("outcome", r.outcome().name());
        body.put("amcConfigurationId", r.configurationId());
        body.put("visitId", r.visitId());
        return ResponseEntity.ok(body);
    }

    @RequestMapping(value = "/_activate-pending", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> activatePending(@RequestParam(required = false) String tenantId,
                                                               @RequestBody RequestInfoWrapper request) {
        String tenant = tenantId == null ? config.getStateTenantId() : tenantId;
        return ResponseEntity.ok(activation.activatePending(tenant, request.getRequestInfo()));
    }

    /** By hand only: creates the next visits a failure left out after a code verification. */
    @RequestMapping(value = "/_create-missing-visits", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> createMissingVisits(@RequestParam(required = false) String tenantId,
                                                                   @RequestBody RequestInfoWrapper request) {
        String tenant = tenantId == null ? config.getStateTenantId() : tenantId;
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("created", nextVisits.createMissing(tenant, request.getRequestInfo()));
        return ResponseEntity.ok(body);
    }

    /** Change the AMC's field staff, optionally with its vendor org (PROJECT_MANAGER, SUPER_ADMIN, END_USER_ADMIN; LLD §6.6). */
    @RequestMapping(value = "/field-staff/_update", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> changeFieldStaff(@RequestBody AmcFieldStaffUpdateRequest request) {
        java.util.List<FieldStaffChangePlanner.Update> updates = request.getAmcFieldStaffUpdates() == null ? java.util.List.of()
                : request.getAmcFieldStaffUpdates().stream().map(i -> new FieldStaffChangePlanner.Update(i.getTenantId(),
                        i.getActivityFacilityId(), i.getVendorOrgId(), i.getFieldStaffUserId(), i.getRejectedVisitFieldStaffUserId())).toList();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("AmcFieldStaffUpdates", fieldStaff.change(updates, request.getRequestInfo()));
        return ResponseEntity.ok(body);
    }
}
