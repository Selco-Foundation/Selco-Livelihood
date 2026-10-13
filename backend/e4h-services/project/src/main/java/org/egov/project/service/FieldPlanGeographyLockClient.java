package org.egov.project.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.egov.project.config.ProjectConfiguration;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Asks field-planner which of a project's geography codes its installation plans use. field-planner
 * owns that rule (GeographyLockService); the project service only enforces it on update.
 */
@Component
@Slf4j
public class FieldPlanGeographyLockClient {

    /** One locked code and the plans holding it, as {@code /geography/_locks} returns them. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeographyLock(String code, List<Map<String, Object>> usedBy) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record LocksResponse(@JsonProperty("GeographyLocks") List<GeographyLock> geographyLocks) {}

    private final ServiceRequestRepository serviceRequestRepository;
    private final ProjectConfiguration config;

    public FieldPlanGeographyLockClient(ServiceRequestRepository serviceRequestRepository, ProjectConfiguration config) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.config = config;
    }

    /** Fails the caller when field-planner cannot answer: an unknown lock set is never "nothing locked". */
    public List<GeographyLock> projectLocks(RequestInfo requestInfo, String projectId) {
        StringBuilder uri = new StringBuilder(config.getFieldPlanServiceHost()).append(config.getFieldPlanGeographyLocksUrl());
        Map<String, Object> request = Map.of("RequestInfo", requestInfo, "projectId", projectId);
        try {
            LocksResponse response = serviceRequestRepository.fetchResult(uri, request, new TypeReference<LocksResponse>() {});
            return response == null || response.geographyLocks() == null ? List.of() : response.geographyLocks();
        } catch (Exception e) {
            log.error("Could not fetch geography locks for project {}", projectId, e);
            throw new CustomException("PROJECT_GEOGRAPHY_LOCKS_UNAVAILABLE",
                    "Could not check whether the removed places are used by an installation plan. Please try again.");
        }
    }
}
