package org.egov.field_planner.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.models.core.SearchResponse;
import org.egov.common.producer.Producer;
import org.egov.common.validator.Validator;
import org.egov.field_planner.config.FieldPlannerConfiguration;
import org.egov.field_planner.repository.FieldPlanFacilityRepository;
import org.egov.field_planner.repository.FieldPlannerRepository;
import org.egov.field_planner.service.enrichment.FieldPlannerEnrichment;
import org.egov.field_planner.util.MDMSUtils;
import org.egov.field_planner.validator.FieldPlannerValidator;
import org.egov.field_planner.web.models.*;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static org.egov.common.utils.CommonUtils.*;
import static org.egov.field_planner.Constants.GET_FIELDPLAN_ID;
import static org.egov.field_planner.util.FieldPlannerConstants.LOCK_STATUS_LOCKED;
import static org.egov.field_planner.util.FieldPlannerConstants.LOCK_STATUS_UNLOCKED;

@Service
@Slf4j
public class FieldPlannerFacilityService {

    private final FieldPlanFacilityRepository fieldPlanFacilityRepository;

    private final FieldPlannerRepository fieldPlannerRepository;
    private final Producer producer;

    private final ServiceRequestRepository serviceRequestClient;
    private final FieldPlannerEnrichment fieldPlannerEnrichment;

    private final List<Validator<FieldPlanFacilityBulkRequest, FieldPlanFacility>> validators;
    private final FieldPlannerConfiguration fieldPlannerConfiguration;
    private final MDMSUtils mdmsUtils;

    private final JdbcTemplate jdbcTemplate;

    @Qualifier("objectMapper")
    private final ObjectMapper mapper;

    @Autowired
    public FieldPlannerFacilityService(
            FieldPlanFacilityRepository fieldPlanFacilityRepository, List<Validator<FieldPlanFacilityBulkRequest, FieldPlanFacility>> validators,
            FieldPlannerValidator fieldPlannerValidator, FieldPlannerEnrichment fieldPlannerEnrichment, FieldPlannerConfiguration fieldPlannerConfiguration,
            Producer producer, FieldPlannerRepository fieldPlannerRepository, MDMSUtils mdmsUtils, ServiceRequestRepository serviceRequestClient, @Qualifier("objectMapper") ObjectMapper mapper, JdbcTemplate jdbcTemplate) {
            this.producer = producer;
            this.fieldPlannerConfiguration = fieldPlannerConfiguration;
            this.fieldPlanFacilityRepository = fieldPlanFacilityRepository;
            this.fieldPlannerEnrichment = fieldPlannerEnrichment;
            this.mdmsUtils = mdmsUtils;
            this.validators = validators;
            this.serviceRequestClient = serviceRequestClient;
            this.mapper = mapper;
            this.fieldPlannerRepository = fieldPlannerRepository;
            this.jdbcTemplate = jdbcTemplate;
    }

    public FieldPlanFacility create(FieldPlanFacilityRequest request) {
        log.info("received request to create fieldplan facility");
        FieldPlanFacilityBulkRequest bulkRequest = FieldPlanFacilityBulkRequest.builder().requestInfo(request.getRequestInfo())
                .fieldPlanFacilities(Collections.singletonList(request.getFieldPlanFacility())).build();
        log.info("creating bulk request");
        return create(bulkRequest, false).get(0);
    }

    public List<FieldPlanFacility> create(FieldPlanFacilityBulkRequest request, boolean isBulk) {
        log.info("received request to create bulk fieldplan facility");
//
        validateCreateFieldPlanRequest(request);
        List<FieldPlanFacility> fieldPlanFacilities = request.getFieldPlanFacilities();
        try {
            if (!fieldPlanFacilities.isEmpty()) {
                log.info("processing {} valid entities", fieldPlanFacilities.size());
                fieldPlannerEnrichment.enrichFieldPlanFacilityOnCreate(fieldPlanFacilities, request);
                applyScopeLock(fieldPlanFacilities);
                // The persister's save-fieldplan-facility-topic mapping now carries solution_id
                // and lock_status, so there is nothing left for a direct JDBC write to add.
                producer.push(fieldPlannerConfiguration.getCreateFieldPlanFacilityTopic(), fieldPlanFacilities);
                log.info("published {} fieldplan facility row(s) to {}", fieldPlanFacilities.size(),
                        fieldPlannerConfiguration.getCreateFieldPlanFacilityTopic());
            }
        } catch (Exception exception) {
            // Deliberately NOT swallowed any more. This used to catch, log and return the
            // request unchanged, so the caller got a 200 whether or not anything was written --
            // and with the write now asynchronous, a swallowed publish failure would be the last
            // synchronous signal we had that the Installation Scope upload went nowhere.
            log.error("error occurred while creating fieldplan facility: {}",
                    ExceptionUtils.getStackTrace(exception));
            throw new CustomException("FIELDPLAN_FACILITY_CREATE_FAILED",
                    "Could not publish the installation scope for this field plan: " + exception.getMessage());
        }

        return fieldPlanFacilities;
    }


    /**
     * A site joins a plan's scope LOCKED, which reserves it for that plan across the whole
     * project: no sibling plan may take it. That closes a real gap -- until this existed the only
     * protection was the published-site bar, derived from a sibling plan reaching SCHEDULED, so
     * two DRAFT plans could both scope one site and whichever published first silently won.
     *
     * The lock bars *other* plans, not this one. The owning plan keeps editing its own scope until
     * it publishes -- removing a site it just added, or changing a site's Solution -- which is why
     * ingestion-service's build_project_lock_map excludes a plan's own unpublished lock from the
     * map it builds. Without that exclusion this would make the Installation Scope step
     * effectively one-shot: facility_validator treats an own-plan lock as fixed and skips the row,
     * so re-uploading a plan's own sheet would fail with "No end user sites are selected".
     *
     * Defaulted, never overridden: a caller that explicitly asked for a lock state gets the one it
     * asked for, which keeps /facility/_update-lock authoritative.
     */
    private void applyScopeLock(List<FieldPlanFacility> fieldPlanFacilities) {
        for (FieldPlanFacility facility : fieldPlanFacilities) {
            if (facility.getLockStatus() == null || facility.getLockStatus().isBlank()) {
                facility.setLockStatus(LOCK_STATUS_LOCKED);
            }
        }
    }

    /**
     * Removing a site from scope releases its reservation. Without this the row would keep
     * lock_status = LOCKED after being soft-deleted and, because the bar is derived per project,
     * the site would stay barred from every plan for good -- unreachable by any UI, because
     * nothing lists a deleted row.
     *
     * Unconditional, unlike applyScopeLock: the unassign payload is often the existing record read
     * straight back off a search (see ingestion-service's unlink_fieldplan_facility), so it
     * usually arrives already carrying LOCKED.
     *
     * ingestion-service also skips soft-deleted links when building the lock map, so the two
     * guards are independent: this one keeps the column honest, that one keeps the rule correct
     * even if this write is ever lost.
     */
    private void releaseScopeLock(List<FieldPlanFacility> fieldPlanFacilities) {
        for (FieldPlanFacility facility : fieldPlanFacilities) {
            facility.setLockStatus(LOCK_STATUS_UNLOCKED);
        }
    }

    public SearchResponse<FieldPlanFacility> search(FieldPlanFacilitySearchRequest request,
                                                  Integer limit,
                                                  Integer offset,
                                                  String tenantId,
                                                  Long lastChangedSince,
                                                  Boolean includeDeleted) throws Exception {
        log.info("received request to search project facility");

        if (isSearchByIdOnly(request.getCriteria())) {
            log.info("searching project facility by id");
            List<String> ids = request.getCriteria().getId();
            log.info("fetching fieldplan facility with ids: {}", ids);
            List<FieldPlanFacility> fieldPlanFacilities = fieldPlanFacilityRepository.findById(ids, includeDeleted).stream()
                    .filter(lastChangedSince(lastChangedSince))
                    .filter(havingTenantId(tenantId))
                    .filter(includeDeleted(includeDeleted))
                    .toList();
            return SearchResponse.<FieldPlanFacility>builder().response(fieldPlanFacilities).build();
        }
        log.info("searching project facility using criteria");
        return fieldPlanFacilityRepository.findWithCount(request.getCriteria(),
                limit, offset, tenantId, lastChangedSince, includeDeleted);
    }

    public FieldPlanFacility unassign(FieldPlanFacilityRequest request) {
        log.info("received request to create fieldplan facility");
        FieldPlanFacilityBulkRequest bulkRequest = FieldPlanFacilityBulkRequest.builder().requestInfo(request.getRequestInfo())
                .fieldPlanFacilities(Collections.singletonList(request.getFieldPlanFacility())).build();
        log.info("creating bulk request");
        return unassignBulk(bulkRequest, false).get(0);
    }

    public List<FieldPlanFacility> unassignBulk(FieldPlanFacilityBulkRequest request, boolean isBulk) {
        log.info("received request to unassign bulk fieldplan facility");
//
        validateCreateFieldPlanRequest(request);
        List<FieldPlanFacility> fieldPlanFacilities = request.getFieldPlanFacilities();
        try {
            if (!fieldPlanFacilities.isEmpty()) {
                for (FieldPlanFacility fieldPlanFacility : fieldPlanFacilities){
                    log.info("processing {} valid entities", fieldPlanFacilities.size());
                    fieldPlannerEnrichment.enrichFieldPlanFacilityRequestOnDelete(fieldPlanFacility, request.getRequestInfo());
                }
                releaseScopeLock(fieldPlanFacilities);
                producer.push(fieldPlannerConfiguration.getDeleteFieldPlanFacilityTopic(), fieldPlanFacilities);
                log.info("successfully created project facility");
            }
        } catch (Exception exception) {
            log.error("error occurred while creating project facility: {}", ExceptionUtils.getStackTrace(exception));
        }

        return fieldPlanFacilities;
    }

    /**
     * Updates lock_status on field_plan_facilities (UNLOCKED once every IC report for the site is approved).
     * Uses direct JDBC because there is no Kafka update mapping for this column yet.
     */
    public FieldPlanFacility updateLockStatus(FieldPlanFacilityRequest request) {
        FieldPlanFacility facility = request.getFieldPlanFacility();
        if (facility == null) {
            throw new CustomException("INVALID_REQUEST", "FieldPlanFacility is required");
        }
        String lockStatus = facility.getLockStatus();
        if (lockStatus == null || lockStatus.isBlank()) {
            throw new CustomException("INVALID_LOCK_STATUS", "lockStatus is required (LOCKED or UNLOCKED)");
        }
        if (!LOCK_STATUS_LOCKED.equalsIgnoreCase(lockStatus) && !LOCK_STATUS_UNLOCKED.equalsIgnoreCase(lockStatus)) {
            throw new CustomException("INVALID_LOCK_STATUS", "lockStatus must be LOCKED or UNLOCKED");
        }
        if (facility.getTenantId() == null || facility.getFieldPlanId() == null || facility.getFacilityId() == null) {
            throw new CustomException("INVALID_REQUEST", "tenantId, fieldPlanId and facilityId are required");
        }

        int updated = jdbcTemplate.update(
                "UPDATE field_plan_facilities SET lock_status = ?, lastmodifiedtime = ? " +
                        "WHERE tenantid = ? AND field_plan_id = ? AND facility_id = ? AND (isdeleted IS NULL OR isdeleted = false)",
                lockStatus.toUpperCase(),
                System.currentTimeMillis(),
                facility.getTenantId(),
                facility.getFieldPlanId(),
                facility.getFacilityId()
        );
        if (updated == 0) {
            throw new CustomException("FIELD_PLAN_FACILITY_NOT_FOUND",
                    "No field_plan_facilities row for fieldPlanId=" + facility.getFieldPlanId()
                            + ", facilityId=" + facility.getFacilityId());
        }
        facility.setLockStatus(lockStatus.toUpperCase());
        log.info("Updated lock_status={} for fieldPlanId={} facilityId={}",
                facility.getLockStatus(), facility.getFieldPlanId(), facility.getFacilityId());
        return facility;
    }

    public void validateCreateFieldPlanRequest(FieldPlanFacilityBulkRequest request) {
        Map<String, String> errorMap = new HashMap<>();

        //Verify if facilityId is valid
        validateFacilityIds(request, errorMap);
        //Verify if FieldPlanId is valid
        validateFieldPlanIds(request, errorMap);

        if (!errorMap.isEmpty())
            throw new CustomException(errorMap);
    }

    private void validateFacilityIds(FieldPlanFacilityBulkRequest request, Map<String, String> errorMap) {

        List<FieldPlanFacility> validEntities = request.getFieldPlanFacilities();
        if (!validEntities.isEmpty()) {
            AtomicInteger counter = new AtomicInteger(1);
            for (FieldPlanFacility facility : validEntities){
                try {
                    Facility response = getFacilityById(facility.getFacilityId());
                    if(response==null)
                        throw new CustomException("FACILITY_ERROR", "Facility ID do not exist");

                    if (!response.getFacilityId().equals(facility.getFacilityId())) {
                        int i = counter.getAndIncrement();
                        errorMap.put("INVALID_FACILITY"+i, "FacilityId does not exist: " + facility.getFacilityId());
                    }

                } catch (Exception e) {
                    log.error("error while fetching facility list", ExceptionUtils.getStackTrace(e));
                    throw new CustomException("FACILITY_ERROR", "error while calling facility service");
                }
            }
        }
    }

    private void validateFieldPlanIds(FieldPlanFacilityBulkRequest request, Map<String, String> errorMap) {
        List<FieldPlanFacility> validEntities = request.getFieldPlanFacilities();
        if (!validEntities.isEmpty()) {
            Class<?> objClass = getObjClass(validEntities);
            Method idMethod = getMethod(GET_FIELDPLAN_ID, objClass);
            List<String> entityIds = validEntities.stream().map(FieldPlanFacility::getFieldPlanId).toList();
            try {
                AtomicInteger counter = new AtomicInteger(1);
                List<String> existingFieldPlansIds = fieldPlannerRepository.validateIds(entityIds, getIdFieldName(idMethod));
                validEntities.stream().filter(entity -> {
                            boolean invalid = !existingFieldPlansIds.contains(entity.getFieldPlanId());
                            if (invalid) {
                                int i = counter.getAndIncrement();
                                errorMap.put("INVALID_FIELDPLAN"+i, "FIELDPLAN_ID does not exist: " + entity.getFieldPlanId());
                            }
                            return invalid;
                        })
                        .toList();

            } catch (Exception e) {
                log.error("error while fetching facility list", ExceptionUtils.getStackTrace(e));
                throw new CustomException("FIELDPLAN_ERROR", "error while calling fieldplan");
            }
        }
    }

    public Facility getFacilityById(String facilityId) {

        String url = fieldPlannerConfiguration.getFacilityServiceHost() + fieldPlannerConfiguration.getFacilityServiceSearchUrlV2()+ "?facilityId="+facilityId;
        Object response = serviceRequestClient.fetchResult(new StringBuilder(url));

        FacilitySearchResponse facilityList = mapper.convertValue(response, FacilitySearchResponse.class);
        if(facilityList != null && facilityList.getFacilities() !=null && facilityList.getFacilities().size() > 0){
            return facilityList.getFacilities().get(0);
        }
        return null;
    }

    /**
     * Searches facilities by a specific boundary code
     */
    public Set<String> searchFacilitiesByBoundaryCode(String boundaryCode, String tenantId, RequestInfo requestInfo) {
        Set<String> facilityIds = new HashSet<>();

        try {
            // Build facility search URL with boundary code filter
            StringBuilder facilitySearchUrl = new StringBuilder();
            facilitySearchUrl.append(fieldPlannerConfiguration.getFacilityServiceHost())
                    .append(fieldPlannerConfiguration.getFacilityServiceSearchUrlV2())
                    .append("?tenantId=")
                    .append(tenantId)
                    .append("&boundaryCode=")
                    .append(boundaryCode);

            log.debug("Searching facilities for boundary code: {} with URL: {}", boundaryCode, facilitySearchUrl);

            // Call facility service
            Object response = serviceRequestClient.fetchResult(facilitySearchUrl);

            if (response != null) {
                FacilitySearchResponse facilitySearchResponse = mapper.convertValue(response, FacilitySearchResponse.class);

                if (facilitySearchResponse != null && facilitySearchResponse.getFacilities() != null) {
                    facilityIds = facilitySearchResponse.getFacilities().stream()
                            .map(Facility::getFacilityId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    log.debug("Found {} facilities for boundary code: {}", facilityIds.size(), boundaryCode);
                }
            }

        } catch (Exception e) {
            log.error("Error searching facilities for boundary code: {}", boundaryCode, e);
        }

        return facilityIds;
    }


}
