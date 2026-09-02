package org.egov.activity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.activity.web.models.*;
import org.egov.common.contract.models.RequestInfoWrapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FacilityWorkflowService {

    @Qualifier("objectMapper")
    private final ObjectMapper mapper;

    private final ActivityConfiguration activityConfiguration;

    private final ServiceRequestRepository repository;

    public FacilityWorkflowService(
            @Qualifier("objectMapper") ObjectMapper mapper,
            ActivityConfiguration activityConfiguration, ServiceRequestRepository repository
    ) {
        this.mapper = mapper;
        this.activityConfiguration = activityConfiguration;
        this.repository = repository;
    }

    public ProcessInstance transitionWorkflow(ActivityFacility activityFacility, String action, List<Document> documents, RequestInfo requestInfo, String workflowComment) {
        ProcessInstance instance = ProcessInstance.builder()
                .businessId(activityFacility.getId())
                .tenantId(activityFacility.getTenantId())
                .moduleName(activityConfiguration.getModuleName())
                .businessService(activityConfiguration.getBusinessService())
                .action(action)
                .documents(documents)
                .comment(workflowComment)
                .build();

        ProcessInstanceRequest wfRequest = ProcessInstanceRequest.builder()
                .requestInfo(requestInfo)
                .processInstances(List.of(instance))
                .build();

        String url = activityConfiguration.getWfHost() + activityConfiguration.getWfTransitionPath();
        Object response = repository.fetchResult(new StringBuilder(url), wfRequest);

        ProcessInstanceResponse wfResponse = mapper.convertValue(response, ProcessInstanceResponse.class);
        if (wfResponse == null || wfResponse.getProcessInstances() == null || wfResponse.getProcessInstances().isEmpty()) {
            throw new CustomException("WORKFLOW_ERROR", "Empty response from workflow transition");
        }
        return wfResponse.getProcessInstances().get(0);
    }


    /**
     * Transitions many entities in ONE call, on a caller-chosen business service.
     *
     * Three differences from transitionWorkflow above, each deliberate:
     *
     * - **It takes business ids, not entities.** Vendor assignment transitions assets whose
     *   facility_activities rows do not exist yet -- they are in the payload about to be published
     *   -- so anything that reads the row first (ActivityService.updateFacilityWorkflow does, and
     *   throws FACILITY_NOT_FOUND) cannot be used. A transition needs only id + tenantId.
     * - **The business service is a parameter.** The same submit transitions the plan on
     *   INSTALLATION_PLAN and its assets on FACILITY_INSTALLATION.
     * - **It batches.** /egov-wf/process/_transition accepts a list, so N assets cost one HTTP
     *   call rather than N. The existing bulk path issues one call per entity per action.
     *
     * Returns businessId -> ProcessInstance so the caller can read each entity's resulting state
     * (`getState().getState()`) rather than assuming a status.
     */
    public Map<String, ProcessInstance> transitionBatch(List<String> businessIds, String businessService,
                                                        String action, String tenantId,
                                                        RequestInfo requestInfo, String comment) {
        if (businessIds == null || businessIds.isEmpty()) {
            return Map.of();
        }

        List<ProcessInstance> instances = businessIds.stream()
                .map(businessId -> ProcessInstance.builder()
                        .businessId(businessId)
                        .tenantId(tenantId)
                        .moduleName(activityConfiguration.getModuleName())
                        .businessService(businessService)
                        .action(action)
                        .comment(comment)
                        .build())
                .collect(Collectors.toList());

        ProcessInstanceRequest wfRequest = ProcessInstanceRequest.builder()
                .requestInfo(requestInfo)
                .processInstances(instances)
                .build();

        String url = activityConfiguration.getWfHost() + activityConfiguration.getWfTransitionPath();
        Object response = repository.fetchResult(new StringBuilder(url), wfRequest);

        ProcessInstanceResponse wfResponse = mapper.convertValue(response, ProcessInstanceResponse.class);
        if (wfResponse == null || wfResponse.getProcessInstances() == null
                || wfResponse.getProcessInstances().isEmpty()) {
            throw new CustomException("WORKFLOW_ERROR",
                    "Empty response from workflow transition '" + action + "' on " + businessService);
        }

        Map<String, ProcessInstance> byBusinessId = new LinkedHashMap<>();
        for (ProcessInstance instance : wfResponse.getProcessInstances()) {
            byBusinessId.put(instance.getBusinessId(), instance);
        }

        // Never let a partially-answered transition look like a complete one: the caller derives
        // each entity's stored status from this map, so a missing entry would otherwise become a
        // null status written to the database.
        List<String> missing = businessIds.stream()
                .filter(id -> !byBusinessId.containsKey(id))
                .collect(Collectors.toList());
        if (!missing.isEmpty()) {
            throw new CustomException("WORKFLOW_ERROR", "Workflow transition '" + action + "' on "
                    + businessService + " returned no state for: " + missing);
        }
        return byBusinessId;
    }

     public List<ProcessInstance> getProcessInstanceById( String businessId, String tenantId, RequestInfo requestInfo) {
        String url = activityConfiguration.getWfHost() + activityConfiguration.getWfSearchPath()
            + "?tenantId=" + tenantId
            + "&businessIds=" + businessId
            + "&history=" + true;

        // Wrap RequestInfo in RequestInfoWrapper
        RequestInfoWrapper requestInfoWrapper = new RequestInfoWrapper();
        requestInfoWrapper.setRequestInfo(requestInfo);

        // POST with requestInfoWrapper as body, query params in URL
        Object response = repository.fetchResult(new StringBuilder(url), requestInfoWrapper);

        ProcessInstanceResponse wfResponse = mapper.convertValue(response, ProcessInstanceResponse.class);
        return (wfResponse.getProcessInstances() == null || wfResponse.getProcessInstances().isEmpty())
            ? null
            : wfResponse.getProcessInstances();
    }
}
