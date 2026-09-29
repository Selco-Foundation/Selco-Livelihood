package org.egov.activity.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.activity.web.models.*;
import org.egov.common.contract.models.RequestInfoWrapper;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FacilityWorkflowService {

    // The read-back wait below is bounded, so a stuck persister surfaces as an error rather than a
    // hung request.
    //
    // Doubling rather than a flat interval, following the retry convention already in rms-service
    // (SauraEmitraConnector, DataCollectorService, CenterIdMappingService all use `delay *= 2`).
    // Two reasons it suits this wait better than the flat 150ms it replaces: the measured Kafka ->
    // persister lag is ~40ms, so a 50ms first sleep usually clears on the second look instead of
    // paying a fixed 150ms; and where the lag is genuinely long, backing off reaches the same total
    // budget in 7 HTTP calls rather than 20, instead of hammering a persister that is already slow.
    //
    // 50ms doubling over 7 attempts spends 50+100+200+400+800+1600 = ~3.15s, matching the ~3s
    // VendorAssignmentService.awaitPersistence allows on the same path. No cap on the individual
    // delay: like rms-service, the attempt count is what bounds this.
    private static final int STATE_WAIT_ATTEMPTS = 7;
    private static final long STATE_WAIT_INITIAL_DELAY_MS = 50L;

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

    /**
     * Current state per business id, in ONE call.
     *
     * Deliberately without history=true: that returns an id's whole trail, and every caller here
     * wants only where each entity stands now. The search matches a comma-separated businessIds
     * list, so N entities cost one HTTP call, matching transitionBatch above.
     *
     * Ids the workflow has never seen are absent from the map rather than mapped to null -- "no
     * instance yet" and "an instance whose state we cannot read" mean the same thing to callers,
     * and absent is the safer of the two to iterate over.
     */
    public Map<String, String> currentStates(List<String> businessIds, String tenantId,
                                             RequestInfo requestInfo) {
        if (businessIds == null || businessIds.isEmpty()) {
            return Map.of();
        }

        String url = activityConfiguration.getWfHost() + activityConfiguration.getWfSearchPath()
                + "?tenantId=" + tenantId
                + "&businessIds=" + String.join(",", businessIds);

        RequestInfoWrapper requestInfoWrapper = new RequestInfoWrapper();
        requestInfoWrapper.setRequestInfo(requestInfo);
        Object response = repository.fetchResult(new StringBuilder(url), requestInfoWrapper);

        ProcessInstanceResponse wfResponse = mapper.convertValue(response, ProcessInstanceResponse.class);
        if (wfResponse == null || wfResponse.getProcessInstances() == null) {
            return Map.of();
        }

        Map<String, String> states = new LinkedHashMap<>();
        for (ProcessInstance instance : wfResponse.getProcessInstances()) {
            if (instance.getState() != null && StringUtils.hasText(instance.getState().getState())) {
                states.put(instance.getBusinessId(), instance.getState().getState());
            }
        }
        return states;
    }

    /**
     * Blocks until every business id reads back as {@code expectedState}.
     *
     * Why this has to exist: /_transition validates against the workflow's own database but
     * persists through Kafka, so a transition is NOT readable the moment it returns 200. A second
     * transition fired straight after the first therefore resolves the entity's state as "no
     * instance", falls back to the start state, finds the action is not legal there, and is
     * rejected with "INVALID ACTION -- Action X not found in config for the businessId".
     *
     * That is not hypothetical. Vendor assignment issued SCHEDULED and ASSIGN_FIELD_STAFF about
     * 20ms apart while the persister needed roughly 40ms, so the second call lost the race on
     * every single submit -- deterministically, because the losing margin was constant.
     *
     * Polling the search rather than sleeping a fixed interval: the lag is a property of Kafka and
     * persister load, not a constant, so the only honest wait is one that ends when the state is
     * actually visible. The gap between looks doubles (see the constants) so that a persister
     * running far behind is given room, instead of being polled hardest exactly when it is slowest.
     *
     * The first look happens before any sleep, so a state that is already visible costs one search
     * and no delay at all.
     */
    public void awaitState(List<String> businessIds, String expectedState, String tenantId,
                           RequestInfo requestInfo) {
        if (businessIds == null || businessIds.isEmpty()) {
            return;
        }

        long startedAt = System.currentTimeMillis();
        long backoffDelay = STATE_WAIT_INITIAL_DELAY_MS;
        List<String> pending = businessIds;

        for (int attempt = 1; attempt <= STATE_WAIT_ATTEMPTS; attempt++) {
            // Sleeping before the look rather than after it keeps the first check immediate and
            // avoids a pointless delay after the final one.
            if (attempt > 1) {
                try {
                    Thread.sleep(backoffDelay);
                    backoffDelay *= 2; // Exponential backoff
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            Map<String, String> states = currentStates(businessIds, tenantId, requestInfo);
            pending = businessIds.stream()
                    .filter(businessId -> !expectedState.equals(states.get(businessId)))
                    .collect(Collectors.toList());
            if (pending.isEmpty()) {
                return;
            }
        }

        // Distinct from a rejection on purpose: the transition was accepted, so the caller must not
        // report this as "the workflow refused you" or retry the action as though it never ran.
        // Reports elapsed wall time rather than the configured budget, because with a growing delay
        // the two diverge -- an interrupt, or a slow search, both cut the wait short.
        throw new CustomException("WORKFLOW_STATE_NOT_VISIBLE",
                "Workflow accepted the transition to " + expectedState + " but it is still not "
                        + "readable after " + STATE_WAIT_ATTEMPTS + " attempt(s) over "
                        + (System.currentTimeMillis() - startedAt) + "ms for: " + pending
                        + ". The transition itself succeeded, so this is a persistence delay rather "
                        + "than a rejection.");
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
