package org.egov.amc.web.controllers;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import org.egov.amc.livelihood.LivelihoodSystemStatus;
import org.egov.amc.livelihood.ProjectSummaryService;
import org.egov.amc.livelihood.SystemStatusService;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Livelihood visit endpoints the mobile app calls (LLD §6.7). */
@RestController
@RequestMapping("/v1/visit")
public class LivelihoodVisitController {

    private final SystemStatusService systemStatus;
    private final ProjectSummaryService projectSummary;

    public LivelihoodVisitController(SystemStatusService systemStatus, ProjectSummaryService projectSummary) {
        this.systemStatus = systemStatus;
        this.projectSummary = projectSummary;
    }

    @Data
    public static class ProjectSummaryRequest {
        @JsonProperty("RequestInfo")
        private RequestInfo requestInfo;
        private ProjectSummaryCriteria searchCriteria;
    }

    @Data
    public static class ProjectSummaryCriteria {
        private String tenantId;
        private List<String> projectIds;
        private String projectName;
        private List<String> states;
        private List<String> districts;
        private List<String> blocks;
        private Integer offset;
        private Integer limit;
    }

    /** Reviewer's project view: five counts per project (AMC_REVIEWER; LLD §6.9). */
    @RequestMapping(value = "/project-summary/_search", method = RequestMethod.POST)
    public ResponseEntity<Map<String, Object>> projectSummary(@RequestBody ProjectSummaryRequest request) {
        ProjectSummaryCriteria c = request.getSearchCriteria() == null ? new ProjectSummaryCriteria() : request.getSearchCriteria();
        return ResponseEntity.ok(projectSummary.search(new ProjectSummaryService.Criteria(c.getTenantId() == null ? "livelihood" : c.getTenantId(),
                c.getProjectIds(), c.getProjectName(), c.getStates(), c.getDistricts(), c.getBlocks(), c.getOffset(), c.getLimit()),
                request.getRequestInfo()));
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
