package org.egov.im.service;

import org.egov.im.repository.IMPriorityRepository;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.web.models.IMPrioritySearchCriteria;
import org.egov.im.web.models.Incident;
import org.egov.im.util.BusinessHoursUtil;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Priority;
import org.egov.im.web.models.workflow.ProcessInstance;
import org.egov.im.web.models.workflow.State;
import org.egov.tracer.model.CustomException;
import com.jayway.jsonpath.JsonPath;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.egov.im.util.IMConstants.*;

@Slf4j
@Service
public class SLAService {

    private final IMPriorityRepository imPriorityRepository;
    private final LivelihoodIssueTypeUtil livelihoodIssueTypeUtil;

    @Autowired
    public SLAService(IMPriorityRepository imPriorityRepository, LivelihoodIssueTypeUtil livelihoodIssueTypeUtil){
        this.imPriorityRepository = imPriorityRepository;
        this.livelihoodIssueTypeUtil = livelihoodIssueTypeUtil;
    }


    public long computeTotalSlaRemaining( List<State> states, List<ProcessInstance> processInstances, List<Map<String, Object>> businessHourList, ProcessInstance currentProcessInstance) {
        BusinessHoursUtil businessHoursUtil = new BusinessHoursUtil(businessHourList);

        Map<String, Long> stateToSlaMap = new HashMap<>();
        for (State state : states) {
            String key = state.getApplicationStatus();
            if (key != null && state.getSla() != null) {
                stateToSlaMap.put(key, state.getSla());
            }
        }
        if(processInstances.isEmpty() || !processInstances.get(processInstances.size() - 1).getState().getState().equals(currentProcessInstance.getState().getState())){
            processInstances.add(currentProcessInstance);
        }
        long remainingTotalSla = 0;

        for (int i = 0; i < processInstances.size(); i++) {
            ProcessInstance current = processInstances.get(i);
            String state = current.getState().getApplicationStatus();

            if (PENDINGFORASSIGNMENT.equals(state) || PENDINGATVENDOR.equals(state)
                    || LIVELIHOOD_PENDING_FOR_RESOLUTION.equals(state)
                    || LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equals(state)
                    || LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR.equals(state)
                    || LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equals(state)
                    || state.startsWith(PENDING_ASSIGNMENT_PREFIX) || state.startsWith(PENDINGFORASSIGNMENT_PREFIX)
                    || state.startsWith(PENDING_RESOLUTION_PREFIX)
                    || RMS_DEVICE_PENDING_TECH_POC.equals(state) || RMS_DEVICE_PENDINGRESOLUTION.equals(state)
                    || OUT_OF_SCOPE.equals(state) || OUT_OF_WARRANTY_PENDING_TECH_POC.equals(state)
                    || PENDING_REVISION.equals(state) || OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2.equals(state)) {
                long prevStateTime = current.getAuditDetails().getCreatedTime();
                ZonedDateTime zonedPrevStateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(prevStateTime), ZoneId.of(ASIA_KOLKATA));
                ZonedDateTime zonedNextStateTime;
                if (i + 1 < processInstances.size()) {
                    long nextStateTime = processInstances.get(i + 1).getAuditDetails().getCreatedTime();
                    zonedNextStateTime = ZonedDateTime.ofInstant(Instant.ofEpochMilli(nextStateTime), ZoneId.of(ASIA_KOLKATA));
                } else {
                    zonedNextStateTime = ZonedDateTime.now(ZoneId.of(ASIA_KOLKATA));
                }
                long currentStateTimeSpent = businessHoursUtil.calculateBusinessDuration(zonedPrevStateTime, zonedNextStateTime);
                long currentStateDefinedSla = stateToSlaMap.getOrDefault(state, 0L);
                if(i + 1 >= processInstances.size() || currentStateDefinedSla-currentStateTimeSpent<0){
                    remainingTotalSla += currentStateDefinedSla-currentStateTimeSpent;
                }
            }
        }
        String currentState = currentProcessInstance.getState().getApplicationStatus();
        if (PENDINGFORASSIGNMENT.equals(currentState) || PENDINGFORASSIGNMENT_THEFT.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(PENDINGATVENDOR, 0L);
            log.debug("Computed remaining SLA for combined state={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (PENDINGFORASSIGNMENT_RMS_DEVICE.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(RMS_DEVICE_PENDING_TECH_POC, 0L);
            log.debug("Computed remaining SLA for RMS device assignment | currentState={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (RMS_DEVICE_PENDING_TECH_POC.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(RMS_DEVICE_PENDINGRESOLUTION, 0L);
            log.debug("Computed remaining SLA for RMS device tech POC | currentState={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (OUT_OF_WARRANTY_PENDING_TECH_POC.equals(currentState)
                || OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(PENDING_ASSIGNMENT_OUT_OF_WARRANTY, 0L);
            log.debug("Computed remaining SLA for out-of-warranty tech POC | currentState={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (OUT_OF_SCOPE.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(PENDING_RESOLUTION_OUT_OF_SCOPE, 0L);
            log.debug("Computed remaining SLA for out-of-scope | currentState={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (PENDING_REVISION.equals(currentState)) {
            remainingTotalSla += stateToSlaMap.getOrDefault(OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2, 0L);
            log.debug("Computed remaining SLA for pending revision | currentState={} totalSlaRemaining={}", currentState, remainingTotalSla);
        } else if (currentState.startsWith(PENDING_ASSIGNMENT_PREFIX)) {
            String suffix = currentState.replace(PENDING_ASSIGNMENT_PREFIX, "");
            String resolutionState = PENDING_RESOLUTION_PREFIX + suffix;
            remainingTotalSla += stateToSlaMap.getOrDefault(resolutionState, 0L);
            log.debug("Computed remaining SLA for assignment workflow | currentState={} resolutionState={} totalSlaRemaining={}",
                    currentState, resolutionState, remainingTotalSla);
        }

        return remainingTotalSla;
    }

    public long computeTotalSla(String currentState, List<State> states, List<ProcessInstance> processInstances) {
        log.info("SLAService::computeTotalSla called | currentState={}", currentState);
        Map<String, Long> stateToSlaMap = new HashMap<>();
        for (State state : states) {
            String key = state.getApplicationStatus();
            if (key != null && state.getSla() != null) {
                stateToSlaMap.put(key, state.getSla());
            }
        }
        long totalSla = 0;
        //calculating sla for all states till current state
        List<String> previousStates = processInstances
                .stream()
                .map(p -> p.getState().getApplicationStatus())
                .collect(Collectors.toList());
        if(previousStates.isEmpty() || !previousStates.get(previousStates.size() - 1).equals(currentState)){
            previousStates.add(currentState);
        }
        for (String state : previousStates) {
            if (PENDINGFORASSIGNMENT.equals(state) || PENDINGATVENDOR.equals(state)
                    || LIVELIHOOD_PENDING_FOR_RESOLUTION.equals(state)
                    || LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equals(state)
                    || LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR.equals(state)
                    || LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equals(state)
                    || state.startsWith(PENDING_ASSIGNMENT_PREFIX) || state.startsWith(PENDINGFORASSIGNMENT_PREFIX)
                    || state.startsWith(PENDING_RESOLUTION_PREFIX)
                    || RMS_DEVICE_PENDING_TECH_POC.equals(state) || RMS_DEVICE_PENDINGRESOLUTION.equals(state)
                    || OUT_OF_SCOPE.equals(state) || OUT_OF_WARRANTY_PENDING_TECH_POC.equals(state)
                    || PENDING_REVISION.equals(state) || OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2.equals(state)) {
                totalSla += stateToSlaMap.getOrDefault(state, 0L);
            }
        }

        //add positive follow-up state
        if (PENDINGFORASSIGNMENT.equals(currentState) || PENDINGFORASSIGNMENT_THEFT.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(PENDINGATVENDOR, 0L);
            log.debug("Computed SLA for combined state={} totalSla={}", currentState, totalSla);
        } else if (PENDINGFORASSIGNMENT_RMS_DEVICE.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(RMS_DEVICE_PENDING_TECH_POC, 0L);
            log.debug("Computed SLA for RMS device assignment | currentState={} totalSla={}", currentState, totalSla);
        } else if (RMS_DEVICE_PENDING_TECH_POC.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(RMS_DEVICE_PENDINGRESOLUTION, 0L);
            log.debug("Computed SLA for RMS device tech POC | currentState={} totalSla={}", currentState, totalSla);
        } else if (OUT_OF_WARRANTY_PENDING_TECH_POC.equals(currentState)
                || OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(PENDING_ASSIGNMENT_OUT_OF_WARRANTY, 0L);
            log.debug("Computed SLA for out-of-warranty tech POC | currentState={} totalSla={}", currentState, totalSla);
        } else if (OUT_OF_SCOPE.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(PENDING_RESOLUTION_OUT_OF_SCOPE, 0L);
            log.debug("Computed SLA for out-of-scope | currentState={} totalSla={}", currentState, totalSla);
        } else if (PENDING_REVISION.equals(currentState)) {
            totalSla += stateToSlaMap.getOrDefault(OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2, 0L);
            log.debug("Computed SLA for pending revision | currentState={} totalSla={}", currentState, totalSla);
        } else if (currentState.startsWith(PENDING_ASSIGNMENT_PREFIX)) {
            String suffix = currentState.replace(PENDING_ASSIGNMENT_PREFIX, "");
            String resolutionState = PENDING_RESOLUTION_PREFIX + suffix;
            totalSla += stateToSlaMap.getOrDefault(resolutionState, 0L);
            log.debug("Computed SLA for assignment workflow | currentState={} resolutionState={} totalSla={}",
                    currentState, resolutionState, totalSla);
        }
        return totalSla;
    }

    public Priority getPriorityFromMDMS(IncidentRequest request, Object mdmsData) {
        String serviceCode = request.getIncident().getIncidentSubType();
        String assetType = request.getIncident().getIncidentType();
        log.info("SLAService::getPriorityFromMDMS called | assetType={} serviceCode={}", assetType, serviceCode);
        String jsonPath = MDMS_SERVICEDEF_SEARCH.replace("{SERVICEDEF}", serviceCode);
        List<Object> res;
        try {
            res = JsonPath.read(mdmsData, jsonPath);
        } catch (Exception e) {
            throw new CustomException(
                "JSONPATH_ERROR",
                "Failed to parse MDMS response for service code: " + serviceCode + ". Error: " + e.getMessage()
            );
        }
        if (CollectionUtils.isEmpty(res)) {
            throw new CustomException(
                "INVALID_SERVICECODE",
                "The service code: " + serviceCode + " is not present in MDMS"
            );
        }
        for (Object obj : res) {
            try {
                if (obj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) obj;
                    String menuPath = getStringValue(map, "menuPath");
                    String mdmsServiceCode = getStringValue(map, "serviceCode");
                    if (assetType.equals(menuPath) && serviceCode.equals(mdmsServiceCode)) {
                        String priorityStr = getStringValue(map, "priority");
                        return Priority.fromString(priorityStr);
                    }
                }
            } catch (Exception e) {
                throw new CustomException(
                    "MDMS_DATA_ERROR",
                    "Error processing MDMS data: " + e.getMessage()
                );
            }
        }
        // Log when default priority is used - could indicate missing MDMS configuration
        log.warn("No priority found in MDMS for assetType: {} and serviceCode: {}, using default priority: MEDIUM",
                 assetType, serviceCode);
        return Priority.MEDIUM;
    }

    /**
     * Livelihood: incidentType is the issue serviceCode; asset category is stored on additionalDetail during create.
     */
    public Priority getLivelihoodPriorityFromMDMS(IncidentRequest request, Object mdmsData) {
        String serviceCode = request.getIncident().getIncidentType();
        String assetCategory = livelihoodIssueTypeUtil.extractAssetCategory(request.getIncident());
        log.info("SLAService::getLivelihoodPriorityFromMDMS | assetCategory={} serviceCode={}", assetCategory, serviceCode);

        if (StringUtils.isBlank(serviceCode)) {
            throw new CustomException("ISSUE_TYPE_MISSING", "incidentType (issue type) is mandatory for Livelihood tickets");
        }

        List<String> menuPaths = new ArrayList<>();
        if (StringUtils.isNotBlank(assetCategory)) {
            menuPaths.add(assetCategory);
        }
        menuPaths.add(LIVELIHOOD_CATCH_ALL_MENU_PATH);

        for (String menuPath : menuPaths) {
            Priority priority = readPriority(serviceCode, menuPath, mdmsData);
            if (priority != null) {
                return priority;
            }
        }

        log.warn("No priority found in MDMS for Livelihood issue type={}, using default MEDIUM", serviceCode);
        return Priority.MEDIUM;
    }

    private Priority readPriority(String serviceCode, String menuPath, Object mdmsData) {
        String jsonPath = MDMS_SERVICEDEF_LIVELIHOOD_SEARCH
                .replace("{SERVICEDEF}", serviceCode)
                .replace("{MENUPATH}", menuPath);
        try {
            List<Object> res = JsonPath.read(mdmsData, jsonPath);
            if (CollectionUtils.isEmpty(res)) {
                return null;
            }
            Object first = res.get(0);
            if (first instanceof Map<?, ?> map) {
                String priorityStr = getStringValue((Map<String, Object>) map, "priority");
                return priorityStr != null ? Priority.fromString(priorityStr) : null;
            }
        } catch (Exception e) {
            throw new CustomException(
                    "JSONPATH_ERROR",
                    "Failed to parse MDMS response for Livelihood issue type: " + serviceCode
            );
        }
        return null;
    }

    private String getStringValue(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    public Priority getPriorityFromIMPriorityTable(Incident incident) {
        String stateTenantId = incident.getTenantId().split("\\.")[0];
        IMPrioritySearchCriteria criteria = IMPrioritySearchCriteria.builder()
                .tenantId(stateTenantId)
                .incidentType(incident.getIncidentType())
                .incidentSubType(incident.getIncidentSubType())
                .systemFunctional(incident.getSystemFunctional())
                .build();
        return imPriorityRepository.getPriority(criteria);
    }
}