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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    /**
     * Resolves the primary vendor organisation id for an HRMS user linked in vendor-registry.
     */
    public String resolvePrimaryOrganisationIdForUser(RequestInfo requestInfo, String tenantId, String userUuid) {
        List<String> organisationIds = findOrganisationIdsByUserUuid(userUuid, tenantId, requestInfo);
        if (CollectionUtils.isEmpty(organisationIds)) {
            return null;
        }
        return organisationIds.get(0);
    }

    /**
     * Normalises an asset {@code vendorId} value (org id, org code, or user uuid) to an organisation id.
     */
    public String resolveOrganisationIdForVendorKey(RequestInfo requestInfo, String tenantId, String vendorKey) {
        if (vendorKey == null || vendorKey.isBlank()) {
            return null;
        }
        String key = vendorKey.trim();
        if (isUuid(key)) {
            List<String> organisationIds = findOrganisationIdsByUserUuid(key, tenantId, requestInfo);
            if (!CollectionUtils.isEmpty(organisationIds)) {
                return organisationIds.get(0);
            }
            return key;
        }
        return findOrganisationIdByCode(key, tenantId, requestInfo);
    }

    public boolean isVendorOrganisation(RequestInfo requestInfo, String tenantId, String organisationId) {
        if (organisationId == null || organisationId.isBlank()) {
            return false;
        }
        String uri = config.getVendorHost() + config.getVendorOrganisationSearchPath();

        Map<String, Object> searchCriteria = new HashMap<>();
        searchCriteria.put("tenantId", tenantId);
        searchCriteria.put("id", organisationId.trim());

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
            return false;
        }
        Object orgType = organisations.get(0).get("orgType");
        return orgType != null && "VENDOR".equalsIgnoreCase(orgType.toString());
    }

    private boolean isUuid(String value) {
        return value.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    /**
     * Keys used on {@code asset.vendor_id}: organisation UUID, organisation code, and the vendor user UUID.
     */
    public Set<String> resolveVendorOrgKeysForUser(RequestInfo requestInfo, String tenantId, String userUuid) {
        Set<String> keys = new LinkedHashSet<>();
        if (userUuid == null || userUuid.isBlank()) {
            return keys;
        }
        keys.add(userUuid.trim());

        if (config.getVendorHost() == null || config.getVendorHost().isBlank()) {
            log.warn("egov.vendor.host is not configured; cannot resolve organisations for vendor user {}", userUuid);
            return keys;
        }

        try {
            List<String> organisationIds = findOrganisationIdsByUserUuid(userUuid.trim(), tenantId, requestInfo);
            keys.addAll(organisationIds);
            for (String organisationId : organisationIds) {
                String code = findOrganisationCodeById(organisationId, tenantId, requestInfo);
                if (code != null && !code.isBlank()) {
                    keys.add(code.trim());
                }
            }
        } catch (Exception e) {
            log.error("Failed to resolve vendor organisations for userUuid={}", userUuid, e);
            throw new CustomException("VENDOR_REGISTRY_ERROR", "Failed to resolve vendor organisations from vendor-registry");
        }
        return keys;
    }

    private List<String> findOrganisationIdsByUserUuid(String userUuid, String tenantId, RequestInfo requestInfo) {
        String uri = UriComponentsBuilder
                .fromUriString(config.getVendorHost() + config.getVendorOrganisationUserSearchPath())
                .queryParam("limit", 50)
                .queryParam("offset", 0)
                .queryParam("tenantId", tenantId)
                .toUriString();

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("userIds", List.of(userUuid));

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", criteria);

        Map<String, Object> response = castToMap(serviceRequestRepository.fetchResult(new StringBuilder(uri), body));
        List<Map<String, Object>> orgUsers = castToListOfMaps(response.get("OrgUsers"));
        if (CollectionUtils.isEmpty(orgUsers)) {
            return List.of();
        }

        List<String> organisationIds = new ArrayList<>();
        for (Map<String, Object> orgUser : orgUsers) {
            if (Boolean.TRUE.equals(orgUser.get("isDeleted"))) {
                continue;
            }
            Object organisationId = orgUser.get("organizationId");
            if (organisationId != null && !organisationId.toString().isBlank()) {
                organisationIds.add(organisationId.toString());
            }
        }
        return organisationIds;
    }

    private String findOrganisationCodeById(String organisationId, String tenantId, RequestInfo requestInfo) {
        String uri = config.getVendorHost() + config.getVendorOrganisationSearchPath();

        Map<String, Object> searchCriteria = new HashMap<>();
        searchCriteria.put("tenantId", tenantId);
        searchCriteria.put("id", organisationId);

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
        Object code = organisations.get(0).get("code");
        return code != null ? code.toString() : null;
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
