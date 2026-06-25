package org.egov.im.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.egov.im.config.IMConfiguration;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class VendorRegistryUtil {

    private final IMConfiguration config;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ObjectMapper objectMapper;

    /**
     * Resolves the HRMS user UUID for a vendor organisation code.
     */
    public String resolveVendorUserUuid(RequestInfo requestInfo, String tenantId, String vendorCode) {
        if (vendorCode == null || vendorCode.isBlank()) {
            return null;
        }
        if (config.getVendorHost() == null || config.getVendorHost().isBlank()) {
            log.warn("egov.vendor.host is not configured; cannot resolve vendor {}", vendorCode);
            return null;
        }

        try {
            String organisationId = findOrganisationIdByCode(vendorCode.trim(), tenantId, requestInfo);
            if (organisationId == null) {
                return null;
            }
            return findFirstOrgUserHrmsUuid(organisationId, tenantId, requestInfo);
        } catch (Exception e) {
            log.error("Failed to resolve vendor user for code={}", vendorCode, e);
            throw new CustomException("VENDOR_REGISTRY_ERROR", "Failed to resolve vendor from vendor-registry");
        }
    }

    private String findOrganisationIdByCode(String vendorCode, String tenantId, RequestInfo requestInfo) {
        String uri = config.getVendorHost() + config.getVendorOrganisationSearchPath();

        Map<String, Object> searchCriteria = new HashMap<>();
        searchCriteria.put("tenantId", tenantId);
        searchCriteria.put("code", vendorCode);

        Map<String, Object> pagination = new HashMap<>();
        pagination.put("limit", 1);
        pagination.put("offset", 0);

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("SearchCriteria", searchCriteria);
        body.put("Pagination", pagination);

        Map<String, Object> response = castToMap(serviceRequestRepository.fetchResult(new StringBuilder(uri), body));
        List<Map<String, Object>> organisations = castToListOfMaps(response.get("organisations"));
        if (CollectionUtils.isEmpty(organisations)) {
            return null;
        }
        Object id = organisations.get(0).get("id");
        return id != null ? id.toString() : null;
    }

    private String findFirstOrgUserHrmsUuid(String organisationId, String tenantId, RequestInfo requestInfo) {
        String uri = UriComponentsBuilder
                .fromUriString(config.getVendorHost() + config.getVendorOrganisationUserSearchPath())
                .queryParam("limit", 10)
                .queryParam("offset", 0)
                .queryParam("tenantId", tenantId)
                .toUriString();

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("organizationIds", List.of(organisationId));

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", criteria);

        Map<String, Object> response = castToMap(serviceRequestRepository.fetchResult(new StringBuilder(uri), body));
        List<Map<String, Object>> orgUsers = castToListOfMaps(response.get("OrgUsers"));
        if (CollectionUtils.isEmpty(orgUsers)) {
            return null;
        }
        for (Map<String, Object> orgUser : orgUsers) {
            if (Boolean.TRUE.equals(orgUser.get("isDeleted"))) {
                continue;
            }
            Object userId = orgUser.get("userId");
            if (userId != null && !userId.toString().isBlank()) {
                return userId.toString();
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object value) {
        if (value == null) {
            return Map.of();
        }
        return objectMapper.convertValue(value, Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castToListOfMaps(Object value) {
        if (value == null) {
            return List.of();
        }
        return objectMapper.convertValue(value, List.class);
    }
}
