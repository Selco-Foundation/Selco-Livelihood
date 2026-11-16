package org.egov.amc.web.controllers;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.egov.amc.livelihood.LivelihoodSystemStatus;
import org.egov.amc.livelihood.SystemStatusService;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/** Livelihood visit endpoints the mobile app calls (LLD §6.7). */
@RestController
@RequestMapping("/v1/visit")
public class LivelihoodVisitController {

    private final SystemStatusService systemStatus;

    public LivelihoodVisitController(SystemStatusService systemStatus) {
        this.systemStatus = systemStatus;
    }

    @Data
    public static class SystemStatusRequest {
        @JsonProperty("RequestInfo")
        private RequestInfo requestInfo;
        private String tenantId;
        private String visitId;
        private Answers systemStatus;
    }

    @Data
    public static class Answers {
        private Boolean isSystemInUse;
        private Boolean isSystemFunctional;
    }

    @RequestMapping(value = "/system-status/_update", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> updateSystemStatus(@RequestBody SystemStatusRequest request) {
        Answers a = request.getSystemStatus();
        LivelihoodSystemStatus.Result r = systemStatus.update(request.getTenantId(), request.getVisitId(),
                a == null ? null : a.getIsSystemInUse(), a == null ? null : a.getIsSystemFunctional(), request.getRequestInfo());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("visitId", request.getVisitId());
        body.put("stored", r.stored());
        body.put("emailSent", r.emailSent());
        return ResponseEntity.ok(body);
    }
}
