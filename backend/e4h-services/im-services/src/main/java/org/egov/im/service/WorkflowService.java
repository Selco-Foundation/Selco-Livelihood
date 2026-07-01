package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.im.config.IMConfiguration;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.BusinessHoursUtil;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.MDMSUtils;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.*;
import org.egov.im.web.models.asset.Asset;
import org.egov.im.web.models.workflow.*;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;

import static org.egov.im.util.IMConstants.*;

@org.springframework.stereotype.Service
@Slf4j
public class WorkflowService {

    private IMConfiguration imConfiguration;

    private ServiceRequestRepository repository;

    private ObjectMapper mapper;

    private NotificationService notificationService;
    private MDMSUtils mdmsUtils;

    private SLAService slaService;

    private LivelihoodTenantUtil livelihoodTenantUtil;

    private AssetRegistryUtil assetRegistryUtil;

    private VendorRegistryUtil vendorRegistryUtil;

    private static final List<String> VENDOR_UUID_KEYS = Arrays.asList(
            "vendorUserUuid", "vendorEmployeeUuid", "assignedVendorUserId", "vendorUserId"
    );

    private static final Map<Priority, String> PRIORITY_BUSINESS_SERVICE_MAP = Map.of(
            Priority.HIGH, IM_BUSINESSSERVICE_HIGH,
            Priority.MEDIUM, IM_BUSINESSSERVICE_MEDIUM,
            Priority.LOW, IM_BUSINESSSERVICE_LOW
    );

    @Getter
    private List<State> states;

    @Autowired
    public WorkflowService(IMConfiguration imConfiguration,
                           ServiceRequestRepository repository,
                           ObjectMapper mapper, NotificationService notificationService, MDMSUtils mdmsUtils,
                           SLAService slaService, LivelihoodTenantUtil livelihoodTenantUtil,
                           AssetRegistryUtil assetRegistryUtil, VendorRegistryUtil vendorRegistryUtil) {
        this.imConfiguration = imConfiguration;
        this.repository = repository;
        this.mapper = mapper;
        this.notificationService = notificationService;
        this.mdmsUtils = mdmsUtils;
        this.slaService = slaService;
        this.livelihoodTenantUtil = livelihoodTenantUtil;
        this.assetRegistryUtil = assetRegistryUtil;
        this.vendorRegistryUtil = vendorRegistryUtil;
    }

    /*
     *
     * Should return the applicable BusinessService for the given request
     *
     * */
    public BusinessService getBusinessService(IncidentRequest incidentRequest, Priority priority) {
        log.trace("WorkflowService::getBusinessService method invoked");
        String tenantId = incidentRequest.getIncident().getTenantId();
        String businessService = resolveBusinessServiceName(incidentRequest, priority);
        log.info("Fetching business service for tenant: {}, priority: {}, businessService: {}",
                tenantId, priority, businessService);
        log.trace("Building search URL and fetching business service");
        StringBuilder url = getSearchURLWithParams(tenantId, businessService);
        RequestInfoWrapper requestInfoWrapper
                = RequestInfoWrapper.builder().requestInfo(incidentRequest.getRequestInfo()).build();
        Object result = repository.fetchResult(url, requestInfoWrapper);
        BusinessServiceResponse response = null;
        try {
            response = mapper.convertValue(result, BusinessServiceResponse.class);
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse business service response", e);
            throw new CustomException("PARSING ERROR", "Failed to parse response of workflow business service search");
        }

        if (CollectionUtils.isEmpty(response.getBusinessServices())) {
            log.error("Business service not found for tenant: {}, businessService: {}", tenantId, IM_BUSINESSSERVICE);
            throw new CustomException("BUSINESSSERVICE_NOT_FOUND", "The businessService " + IM_BUSINESSSERVICE + " is not found");
        }

        log.debug("Business service fetched successfully");
        return response.getBusinessServices().get(0);
    }


    /*
     * Call the workflow service with the given action and update the status
     * return the updated status of the application
     *
     * */
    public ProcessInstance updateWorkflowStatus(IncidentRequestWrapper wrapper, Object mdmsData) {
        log.trace("WorkflowService::updateWorkflowStatus method invoked");
        IncidentRequest incidentRequest = wrapper.getIncidentRequest();
        Priority priority = livelihoodTenantUtil.isLivelihood(incidentRequest.getIncident().getTenantId())
                ? slaService.getLivelihoodPriorityFromMDMS(incidentRequest, mdmsData)
                : slaService.getPriorityFromIMPriorityTable(incidentRequest.getIncident());
        log.trace("Creating process instance for workflow");
        ProcessInstance processInstance = getProcessInstanceForIM(incidentRequest, priority);
        log.info("Updating workflow status for incident: {}, tenant: {}",
                incidentRequest.getIncident().getIncidentId(), incidentRequest.getIncident().getTenantId());
        ProcessInstanceRequest workflowRequest = new ProcessInstanceRequest(incidentRequest.getRequestInfo(), Collections.singletonList(processInstance));
        log.debug("Calling workflow transition for incident: {} with action: {}",
                incidentRequest.getIncident().getIncidentId(), incidentRequest.getWorkflow().getAction());
        ProcessInstance updatedProcessInstance = callWorkFlow(workflowRequest);
        String newStatus = updatedProcessInstance.getState().getApplicationStatus();
        incidentRequest.getIncident().setApplicationStatus(newStatus);
        log.info("Workflow status updated for incident: {}. New status: {}", incidentRequest.getIncident().getIncidentId(), newStatus);
        log.trace("Enriching total SLA");
        enrichTotalSla(wrapper, updatedProcessInstance);
        return updatedProcessInstance;
    }

    private void enrichTotalSla(IncidentRequestWrapper wrapper, ProcessInstance processInstance) {
        log.trace("WorkflowService::enrichTotalSla method invoked");
        IncidentRequest request = wrapper.getIncidentRequest();
        log.debug("Enriching SLA for incident: {}", request.getIncident().getIncidentId());
        String applicationStatus = request.getIncident().getApplicationStatus();
        RequestInfo requestInfo= request.getRequestInfo();
        String tenantId = request.getIncident().getTenantId();
        String IncidentId = request.getIncident().getIncidentId();

        // Step 1: Fetch MDMS BusinessHours data
        log.trace("Fetching BusinessHours from MDMS");
        Object mdmsData = mdmsUtils.fetchMDMSData(
                request.getRequestInfo(),
                request.getIncident().getTenantId(),
                "common-masters",
                List.of("BusinessHours"),
                null
        );

        // Step 2: Parse BusinessHours config
        List<Map<String, Object>> businessHourList;
        try {
            businessHourList = JsonPath.read(
                    mdmsData,
                    "$.MdmsRes['common-masters'].BusinessHours[0].BusinessHours"
            );
        } catch (Exception e) {
            log.error("Failed to parse BusinessHours from MDMS", e);
            throw new CustomException("MDMS_PARSE_ERROR", "Unable to parse BusinessHours from MDMS");
        }

        if (businessHourList == null || businessHourList.isEmpty()) {
            log.error("BusinessHours config missing from MDMS for tenant: {}", tenantId);
            throw new CustomException("MDMS_MISSING", "BusinessHours config missing from MDMS");
        }

        //get all process instances
        log.trace("Fetching all process instances for SLA and lifecycle calculation");
        List<ProcessInstance> processInstances = getAllProcessInstances(tenantId,IncidentId, requestInfo);

        // Compute first-round resolved / declined timestamps (before any reordering)
        enrichResolvedAndDeclinedTimestamps(wrapper, processInstances);

        // Step 3: Use BusinessHoursUtil (requires latest cycle ordering)
        Collections.reverse(processInstances);
        log.trace("Calculating business hours elapsed and total SLA");
        BusinessHoursUtil util = new BusinessHoursUtil(businessHourList);
        long businessHoursElapsed = util.calculateBusinessDurationForAllStates(processInstances);
        long definedTotalSla = slaService.computeTotalSla(applicationStatus, this.getStates(), processInstances);
        long totalSlaRemaining = slaService.computeTotalSlaRemaining(this.getStates(), processInstances, businessHourList,processInstance);
        log.debug("SLA calculation completed: definedTotalSla={}, businessHoursElapsed={}, totalSlaRemaining={}",
                definedTotalSla, businessHoursElapsed, totalSlaRemaining);

        wrapper.getIndexView().setDefinedTotalSla(definedTotalSla);
        processInstance.getState().setTotalSlaRemaining(totalSlaRemaining);
    }

    /**
     * Computes first-round resolved and declined timestamps from the workflow history
     * and stores them on IndexView so they are available in every index update.
     */
    private void enrichResolvedAndDeclinedTimestamps(IncidentRequestWrapper wrapper, List<ProcessInstance> processInstances) {
        if (CollectionUtils.isEmpty(processInstances)) {
            return;
        }

        // Ensure chronological order (oldest first) for first-occurrence detection
        List<ProcessInstance> ordered = new ArrayList<>(processInstances);
        ordered.sort(Comparator.comparing(pi -> {
            if (pi.getAuditDetails() != null && pi.getAuditDetails().getCreatedTime() != null) {
                return pi.getAuditDetails().getCreatedTime();
            }
            // fallback to 0 if timestamps are missing
            return 0L;
        }));

        Long firstResolvedTs = null;
        Long firstDeclinedTs = null;

        for (ProcessInstance pi : ordered) {
            State state = pi.getState();
            AuditDetails auditDetails = pi.getAuditDetails();

            if (state == null || auditDetails == null || auditDetails.getCreatedTime() == null) {
                continue;
            }

            String status = state.getApplicationStatus();
            Long ts = auditDetails.getCreatedTime();

            if (status == null) {
                continue;
            }

            if (firstResolvedTs == null && "RESOLVED".equalsIgnoreCase(status)) {
                firstResolvedTs = ts;
            }

            // Treat REJECTED as decline; extend if you introduce explicit DECLINE statuses
            if (firstDeclinedTs == null && "REJECTED".equalsIgnoreCase(status)) {
                firstDeclinedTs = ts;
            }

            if (firstResolvedTs != null && firstDeclinedTs != null) {
                break;
            }
        }

        IndexView indexView = wrapper.getIndexView();
        if (indexView == null) {
            indexView = new IndexView();
            wrapper.setIndexView(indexView);
        }

        indexView.setResolvedTimestamp(firstResolvedTs);
        indexView.setDeclinedTimestamp(firstDeclinedTs);
    }

    /**
     * Creates url for search based on given tenantId and businessservices
     *
     * @param tenantId        The tenantId for which url is generated
     * @param businessService The businessService for which url is generated
     * @return The search url
     */
    private StringBuilder getSearchURLWithParams(String tenantId, String businessService) {
        log.trace("WorkflowService::getSearchURLWithParams method invoked");
        StringBuilder url = new StringBuilder(imConfiguration.getWfHost());
        url.append(imConfiguration.getWfBusinessServiceSearchPath());
        url.append("?tenantId=");
        url.append(tenantId);
        url.append("&businessServices=");
        url.append(businessService);
        return url;
    }


    public List<IncidentWrapper> enrichWorkflow(RequestInfo requestInfo, List<IncidentWrapper> incidentWrappers) {
        log.trace("WorkflowService::enrichWorkflow method invoked");
        log.info("Enriching workflow for {} incident wrappers", incidentWrappers.size());

        // FIX ME FOR BULK SEARCH
        log.trace("Grouping incident wrappers by tenantId");
        Map<String, List<IncidentWrapper>> tenantIdToServiceWrapperMap = getTenantIdToServiceWrapperMap(incidentWrappers);

        List<IncidentWrapper> enrichedServiceWrappers = new ArrayList<>();

        for (String tenantId : tenantIdToServiceWrapperMap.keySet()) {

            List<String> serviceRequestIds = new ArrayList<>();

            List<IncidentWrapper> tenantSpecificWrappers = tenantIdToServiceWrapperMap.get(tenantId);

            tenantSpecificWrappers.forEach(pgrEntity -> {
                serviceRequestIds.add(pgrEntity.getIncident().getIncidentId());
            });

            RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();

            log.trace("Fetching process instances for tenant: {} with {} incident IDs", tenantId, serviceRequestIds.size());
            StringBuilder searchUrl = getprocessInstanceSearchURL(tenantId, StringUtils.join(serviceRequestIds, ','));
            Object result = repository.fetchResult(searchUrl, requestInfoWrapper);


            ProcessInstanceResponse processInstanceResponse = null;
            try {
                processInstanceResponse = mapper.convertValue(result, ProcessInstanceResponse.class);
            } catch (IllegalArgumentException e) {
                log.error("Failed to parse process instance response", e);
                throw new CustomException("PARSING ERROR", "Failed to parse response of workflow processInstance search");
            }

            if (CollectionUtils.isEmpty(processInstanceResponse.getProcessInstances()) || processInstanceResponse.getProcessInstances().size() != serviceRequestIds.size())
                throw new CustomException("WORKFLOW_NOT_FOUND", "The workflow object is not found");

            Map<String, Workflow> businessIdToWorkflow = getWorkflow(processInstanceResponse.getProcessInstances());

            tenantSpecificWrappers.forEach(pgrEntity -> {
                pgrEntity.setWorkflow(businessIdToWorkflow.get(pgrEntity.getIncident().getIncidentId()));
            });

            enrichedServiceWrappers.addAll(tenantSpecificWrappers);
        }

        return enrichedServiceWrappers;

    }

    public void enrichProcessHistory(RequestInfo requestInfo, List<IncidentWrapper> incidentWrappers) {
        if (CollectionUtils.isEmpty(incidentWrappers)) {
            return;
        }
        for (IncidentWrapper wrapper : incidentWrappers) {
            String tenantId = wrapper.getIncident().getTenantId();
            String incidentId = wrapper.getIncident().getIncidentId();
            RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
            StringBuilder searchUrl = getprocessInstanceSearchURL(tenantId, incidentId);
            searchUrl.append("&history=true");
            Object result = repository.fetchResult(searchUrl, requestInfoWrapper);
            ProcessInstanceResponse processInstanceResponse;
            try {
                processInstanceResponse = mapper.convertValue(result, ProcessInstanceResponse.class);
            } catch (IllegalArgumentException e) {
                log.error("Failed to parse process instance history for incidentId={}", incidentId, e);
                continue;
            }
            if (processInstanceResponse != null
                    && !CollectionUtils.isEmpty(processInstanceResponse.getProcessInstances())) {
                wrapper.setProcessHistory(processInstanceResponse.getProcessInstances());
            }
        }
    }

    private String resolveBusinessServiceName(IncidentRequest incidentRequest, Priority priority) {
        if (livelihoodTenantUtil.isLivelihood(incidentRequest.getIncident().getTenantId())) {
            return LIVELIHOOD_BUSINESSSERVICE;
        }
        return PRIORITY_BUSINESS_SERVICE_MAP.getOrDefault(priority, IM_BUSINESSSERVICE);
    }

    private Map<String, List<IncidentWrapper>> getTenantIdToServiceWrapperMap(List<IncidentWrapper> incidentWrappers) {
        log.trace("WorkflowService::getTenantIdToServiceWrapperMap method invoked");
        Map<String, List<IncidentWrapper>> resultMap = new HashMap<>();
        for (IncidentWrapper incidentWrapper : incidentWrappers) {
            if (resultMap.containsKey(incidentWrapper.getIncident().getTenantId())) {
                resultMap.get(incidentWrapper.getIncident().getTenantId()).add(incidentWrapper);
            } else {
                List<IncidentWrapper> incidentWrapperList = new ArrayList<>();
                incidentWrapperList.add(incidentWrapper);
                resultMap.put(incidentWrapper.getIncident().getTenantId(), incidentWrapperList);
            }
        }
        log.debug("Grouped {} incident wrappers into {} tenant groups", incidentWrappers.size(), resultMap.size());
        return resultMap;
    }

    /**
     * Enriches ProcessInstance Object for workflow
     *
     * @param request
     */
    private ProcessInstance getProcessInstanceForIM(IncidentRequest request, Priority priority) {
        log.trace("WorkflowService::getProcessInstanceForIM method invoked");
        Incident incident = request.getIncident();
        Workflow workflow = request.getWorkflow();
        String action = request.getWorkflow().getAction();
        log.debug("Creating process instance for incident: {} with action: {}", incident.getIncidentId(), action);
        if (livelihoodTenantUtil.isLivelihood(incident.getTenantId())) {
            applyLivelihoodWorkflowRules(workflow, request, action);
        } else if (action.equalsIgnoreCase("RESOLVE") || action.equalsIgnoreCase("REJECT")) {
            reassignWorkflow(workflow, request, "COMPLAINANT");
        } else if (request.getIncident()!=null && request.getIncident().getApplicationStatus()!= null &&
                request.getIncident().getApplicationStatus().trim().equals("PENDINGRESOLUTION") && action.equalsIgnoreCase("MARK_OUT_OF_SCOPE")) {
            reassignWorkflow(workflow, request, "COMPLAINT_FACILITATOR_1");
        }
        ProcessInstance processInstance = new ProcessInstance();
        processInstance.setBusinessId(incident.getIncidentId());
        processInstance.setAction(request.getWorkflow().getAction());
        processInstance.setModuleName(IM_MODULENAME);
        processInstance.setTenantId(incident.getTenantId());
        BusinessService businessService = getBusinessService(request, priority);
        this.states = businessService.getStates();
        processInstance.setBusinessService(businessService.getBusinessService());
        processInstance.setDocuments(request.getWorkflow().getVerificationDocuments());
        processInstance.setComment(workflow.getComments());

        if(request.getWorkflow().getAction().equalsIgnoreCase("RATE")) {
            processInstance.setRating(workflow.getRating());
        }

        if (!CollectionUtils.isEmpty(workflow.getAssignes())) {
            List<User> users = new ArrayList<>();

            workflow.getAssignes().forEach(uuid -> {
                User user = new User();
                user.setUuid(uuid);
                users.add(user);
            });

            processInstance.setAssignes(users);
        }

        return processInstance;
    }

    private void reassignWorkflow(Workflow workflow, IncidentRequest request, String role) {
        log.trace("WorkflowService::reassignWorkflow method invoked for role: {}", role);
        workflow.setAssignes(null);
        log.debug("Fetching employee details for role: {}", role);
        Map<String, String> reassigneeDetails = notificationService.getHRMSEmployee(request, role);
        List<String> assignee = Arrays.asList(reassigneeDetails.get("employeeUUID"));
        workflow.setAssignes(assignee);
        log.debug("Workflow reassigned to employee with UUID: {}", reassigneeDetails.get("employeeUUID"));
    }

    private void applyLivelihoodWorkflowRules(Workflow workflow, IncidentRequest request, String action) {
        if (action == null) {
            return;
        }
        String normalized = action.trim().toUpperCase(Locale.ROOT);
        if (IM_WF_RESOLVE.equals(normalized) || REJECT.equals(normalized)) {
            assignComplainantForResolve(workflow, request);
        } else if (LIVELIHOOD_WF_OUT_OF_SCOPE.equals(normalized)) {
            reassignWorkflow(workflow, request, ROLE_LIVELIHOOD_POC);
        } else if (LIVELIHOOD_WF_DECLINE.equals(normalized)) {
            clearAssigneesForTerminalAction(workflow);
        } else if (LIVELIHOOD_WF_OUT_OF_WARRANTY.equals(normalized)) {
            keepActingVendorAssigned(workflow, request);
        } else if (LIVELIHOOD_WF_REVISE_QUOTATION.equals(normalized)) {
            keepActingVendorAssigned(workflow, request);
        } else if (REASSIGN.equals(normalized)) {
            assignVendorFromAssetForReassign(workflow, request);
        } else if (IM_WF_REOPEN.equals(normalized)) {
            assignVendorForReopen(workflow, request);
        }
    }

    /**
     * Livelihood RESOLVE moves the ticket to the RESOLVED state, whose only citizen-facing action
     * (REOPEN) is restricted to the COMPLAINANT role. 
    */
    private void assignComplainantForResolve(Workflow workflow, IncidentRequest request) {
        String complainantUuid = resolveComplainantUuid(request);
        if (StringUtils.isBlank(complainantUuid)) {
            throw new CustomException("COMPLAINANT_NOT_FOUND",
                    "Could not determine the complainant to assign the resolved ticket to");
        }
        workflow.setAssignes(List.of(complainantUuid));
        log.debug("RESOLVE assigned ticket {} to complainant {}",
                request.getIncident().getIncidentId(), complainantUuid);
    }

    private String resolveComplainantUuid(IncidentRequest request) {
        Incident incident = request.getIncident();
        if (incident == null) {
            return null;
        }
        if (StringUtils.isNotBlank(incident.getAccountId())) {
            return incident.getAccountId();
        }
        if (incident.getReporter() != null && StringUtils.isNotBlank(incident.getReporter().getUuid())) {
            return incident.getReporter().getUuid();
        }
        return null;
    }

    /**
     * DECLINE (vendor rejecting after OOW) transitions to the terminal CLOSED_AFTER_DECLINE state,
     * which has no actions/roles. Any assignee on a terminal transition is rejected by the workflow
     * validator (INVALID_ASSIGNEE), so the ticket must be closed with no assignee.
     */
    private void clearAssigneesForTerminalAction(Workflow workflow) {
        workflow.setAssignes(Collections.emptyList());
        log.debug("Cleared assignees for terminal DECLINE transition");
    }

    /**
     * OUT_OF_WARRANTY keeps the ticket with the vendor who raised the quotation: the next state
     * (OUT_OF_WARRANTY_PENDING_VENDOR) still requires that same vendor to RESOLVE/DECLINE. Without
     * this, the workflow would clear assignes and the ticket would appear unassigned to every vendor.
     */
    private void keepActingVendorAssigned(Workflow workflow, IncidentRequest request) {
        if (!CollectionUtils.isEmpty(workflow.getAssignes())) {
            return;
        }
        String vendorUuid = request.getRequestInfo() != null && request.getRequestInfo().getUserInfo() != null
                ? request.getRequestInfo().getUserInfo().getUuid()
                : null;
        if (StringUtils.isBlank(vendorUuid)) {
            throw new CustomException(REOPEN_VENDOR_NOT_FOUND_CODE,
                    "Could not determine the acting vendor to retain assignment for OUT_OF_WARRANTY");
        }
        workflow.setAssignes(List.of(vendorUuid));
        log.debug("OUT_OF_WARRANTY retained ticket {} with acting vendor {}",
                request.getIncident().getIncidentId(), vendorUuid);
    }

    public Long getLatestResolvedTimestamp(String tenantId, String incidentId, RequestInfo requestInfo) {
        List<ProcessInstance> processInstances = getAllProcessInstances(tenantId, incidentId, requestInfo);
        Long latest = null;
        for (ProcessInstance processInstance : processInstances) {
            if (processInstance.getState() == null) {
                continue;
            }
            String status = processInstance.getState().getApplicationStatus();
            if (!LIVELIHOOD_RESOLVED.equalsIgnoreCase(status) && !RESOLVED.equalsIgnoreCase(status)) {
                continue;
            }
            if (processInstance.getAuditDetails() == null
                    || processInstance.getAuditDetails().getCreatedTime() == null) {
                continue;
            }
            long ts = processInstance.getAuditDetails().getCreatedTime();
            if (latest == null || ts > latest) {
                latest = ts;
            }
        }
        return latest;
    }

    private void assignVendorForReopen(Workflow workflow, IncidentRequest request) {
        String vendorUuid = resolveVendorUuidForReopen(request);
        if (StringUtils.isBlank(vendorUuid)) {
            throw new CustomException(REOPEN_VENDOR_NOT_FOUND_CODE, REOPEN_VENDOR_NOT_FOUND_MSG);
        }
        workflow.setAssignes(List.of(vendorUuid));
        log.debug("Reopen reassigned ticket {} to vendor {}", request.getIncident().getIncidentId(), vendorUuid);
    }

    /**
     * POC REASSIGN (OOS) sends the ticket back to the asset's mapped vendor — same vendor as at create.
     */
    private void assignVendorFromAssetForReassign(Workflow workflow, IncidentRequest request) {
        String vendorUuid = resolveVendorFromAsset(request);
        if (StringUtils.isBlank(vendorUuid)) {
            throw new CustomException(REOPEN_VENDOR_NOT_FOUND_CODE, REOPEN_VENDOR_NOT_FOUND_MSG);
        }
        workflow.setAssignes(List.of(vendorUuid));
        log.debug("REASSIGN auto-assigned ticket {} to asset vendor {}",
                request.getIncident().getIncidentId(), vendorUuid);
    }

    private String resolveVendorUuidForReopen(IncidentRequest request) {
        Incident incident = request.getIncident();
        String vendorFromHistory = resolveVendorFromProcessHistory(
                incident.getTenantId(),
                incident.getIncidentId(),
                request.getRequestInfo()
        );
        if (StringUtils.isNotBlank(vendorFromHistory)) {
            return vendorFromHistory;
        }
        return resolveVendorFromAsset(request);
    }

    private String resolveVendorFromProcessHistory(String tenantId, String incidentId, RequestInfo requestInfo) {
        List<ProcessInstance> cycle = new ArrayList<>(getAllProcessInstances(tenantId, incidentId, requestInfo));
        cycle.sort(Comparator.comparingLong(pi -> {
            if (pi.getAuditDetails() != null && pi.getAuditDetails().getCreatedTime() != null) {
                return pi.getAuditDetails().getCreatedTime();
            }
            return 0L;
        }));

        String lastVendorUuid = null;
        for (int i = 1; i < cycle.size(); i++) {
            ProcessInstance current = cycle.get(i);
            if (current.getAction() == null || !IM_WF_RESOLVE.equalsIgnoreCase(current.getAction().trim())) {
                continue;
            }
            String assignee = firstAssigneeUuid(cycle.get(i - 1));
            if (StringUtils.isNotBlank(assignee)) {
                lastVendorUuid = assignee;
            }
        }
        return lastVendorUuid;
    }

    private String firstAssigneeUuid(ProcessInstance processInstance) {
        if (processInstance == null || CollectionUtils.isEmpty(processInstance.getAssignes())) {
            return null;
        }
        return processInstance.getAssignes().stream()
                .filter(Objects::nonNull)
                .map(User::getUuid)
                .filter(StringUtils::isNotBlank)
                .findFirst()
                .orElse(null);
    }

    private String resolveVendorFromAsset(IncidentRequest request) {
        Incident incident = request.getIncident();
        Asset asset = assetRegistryUtil.fetchAsset(
                request.getRequestInfo(),
                incident.getTenantId(),
                incident.getAssetId(),
                incident.getFacilityId()
        );
        if (StringUtils.isNotBlank(asset.getVendorId())) {
            String vendorId = asset.getVendorId().trim();
            if (vendorId.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {
                return vendorId;
            }
            String resolved = vendorRegistryUtil.resolveVendorUserUuid(
                    request.getRequestInfo(), incident.getTenantId(), vendorId);
            if (StringUtils.isNotBlank(resolved)) {
                return resolved;
            }
        }
        String vendorUuid = extractVendorUuid(asset.getAdditionalDetails());
        if (StringUtils.isBlank(vendorUuid)) {
            vendorUuid = extractVendorUuid(asset.getAssetDetails());
        }
        return vendorUuid;
    }

    private String extractVendorUuid(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        for (String key : VENDOR_UUID_KEYS) {
            Object value = details.get(key);
            if (value != null && StringUtils.isNotBlank(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        Object vendorId = details.get("vendorId");
        if (vendorId != null && StringUtils.isNotBlank(String.valueOf(vendorId))) {
            return String.valueOf(vendorId).trim();
        }
        return null;
    }

    public List<String> getCurrentAssigneeUuids(String tenantId, String incidentId, RequestInfo requestInfo) {
        if (StringUtils.isBlank(tenantId) || StringUtils.isBlank(incidentId) || requestInfo == null) {
            return Collections.emptyList();
        }
        RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        StringBuilder searchUrl = getprocessInstanceSearchURL(tenantId, incidentId);
        Object result = repository.fetchResult(searchUrl, requestInfoWrapper);
        try {
            ProcessInstanceResponse response = mapper.convertValue(result, ProcessInstanceResponse.class);
            if (response == null || CollectionUtils.isEmpty(response.getProcessInstances())) {
                return Collections.emptyList();
            }
            ProcessInstance processInstance = response.getProcessInstances().get(0);
            if (CollectionUtils.isEmpty(processInstance.getAssignes())) {
                return Collections.emptyList();
            }
            return processInstance.getAssignes().stream()
                    .filter(Objects::nonNull)
                    .map(User::getUuid)
                    .filter(StringUtils::isNotBlank)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Failed to fetch current assignee for incidentId={}", incidentId, e);
            return Collections.emptyList();
        }
    }

    /**
     * @param processInstances
     */
    public Map<String, Workflow> getWorkflow(List<ProcessInstance> processInstances) {
        log.trace("WorkflowService::getWorkflow method invoked");
        log.debug("Converting {} process instances to workflow map", processInstances.size());
        Map<String, Workflow> businessIdToWorkflow = new HashMap<>();

        processInstances.forEach(processInstance -> {
            List<String> userIds = null;

            if (!CollectionUtils.isEmpty(processInstance.getAssignes())) {
                userIds = processInstance.getAssignes().stream().map(User::getUuid).collect(Collectors.toList());
            }

            Workflow workflow = Workflow.builder()
                    .action(processInstance.getAction())
                    .assignes(userIds)
                    .comments(processInstance.getComment())
                    .rating(processInstance.getRating())
                    .verificationDocuments(processInstance.getDocuments())
                    .build();

            businessIdToWorkflow.put(processInstance.getBusinessId(), workflow);
        });

        log.debug("Successfully converted {} process instances to workflow map", businessIdToWorkflow.size());
        return businessIdToWorkflow;
    }

    private List<ProcessInstance> getAllProcessInstances(String tenantId, String IncidentId, RequestInfo requestInfo){
        log.trace("WorkflowService::getAllProcessInstances method invoked");
        RequestInfoWrapper requestInfoWrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();

        StringBuilder URL = getprocessInstanceSearchURL(tenantId, IncidentId);
        URL.append("&").append("history=true");

        log.trace("Fetching process instance history");
        Object result = repository.fetchResult(URL, requestInfoWrapper);
        ProcessInstanceResponse processInstanceResponse = null;
        try {
            processInstanceResponse = mapper.convertValue(result, ProcessInstanceResponse.class);
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse process instance history response", e);
            throw new CustomException("PARSING ERROR", "Failed to parse response of workflow processInstance search");
        }
        if (processInstanceResponse == null || CollectionUtils.isEmpty(processInstanceResponse.getProcessInstances())) {
            log.debug("No process instances found in history for incident: {}", IncidentId);
            return Collections.emptyList();
        }

        List<ProcessInstance> processInstances =  processInstanceResponse.getProcessInstances();

        // Get latest cycle of the ticket
        Collections.reverse(processInstances);
        int lastIndex = -1;
        for (int i = processInstances.size() - 1; i >= 0; i--) {
            String state = processInstances.get(i).getState().getState();
            if (PENDINGFORASSIGNMENT.equals(state)
                    || LIVELIHOOD_PENDING_FOR_RESOLUTION.equals(state)) {
                lastIndex = i;
                break;
            }
        }
        if (lastIndex != -1) {
            return new ArrayList<>(processInstances.subList(lastIndex, processInstances.size()));
        } else {
            return new ArrayList<>(processInstances);
        }
    }


    /**
     * Method to integrate with workflow
     * <p>
     * take the ProcessInstanceRequest as paramerter to call wf-service
     * <p>
     * and return wf-response to sets the resultant status
     */
    private ProcessInstance callWorkFlow(ProcessInstanceRequest workflowReq) {
        log.trace("WorkflowService::callWorkFlow method invoked");
        log.info("Calling workflow transition service");

        ProcessInstanceResponse response = null;
        StringBuilder url = new StringBuilder(imConfiguration.getWfHost().concat(imConfiguration.getWfTransitionPath()));
        log.trace("Calling workflow service at URL: {}", url);
        Object optional = repository.fetchResult(url, workflowReq);
        try {
            response = mapper.convertValue(optional, ProcessInstanceResponse.class);
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse workflow transition response", e);
            throw new CustomException("PARSING_ERROR", "Failed to parse workflow transition response");
        }
        log.debug("Workflow transition completed successfully");
        return response.getProcessInstances().get(0);
    }

    public StringBuilder getprocessInstanceSearchURL(String tenantId, String IncidentId) {
        log.trace("WorkflowService::getprocessInstanceSearchURL method invoked");
        StringBuilder url = new StringBuilder(imConfiguration.getWfHost());
        url.append(imConfiguration.getWfProcessInstanceSearchPath());
        url.append("?tenantId=");
        url.append(tenantId);
        url.append("&businessIds=");
        url.append(IncidentId);
        return url;
    }
}
