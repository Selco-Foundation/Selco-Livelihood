package org.egov.inbox.service.V2;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.inbox.config.InboxConfiguration;
import org.egov.inbox.repository.ServiceRequestRepository;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Resolves asset IDs mapped to a Livelihood vendor user via vendor-registry + asset-registry.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorMappedAssetResolver {

    private static final int ASSET_PAGE_SIZE = 200;

    private final InboxConfiguration config;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ObjectMapper objectMapper;

    public List<String> resolveMappedAssetIds(RequestInfo requestInfo, String tenantId, String userUuid) {
        if (requestInfo == null || StringUtils.isBlank(tenantId) || StringUtils.isBlank(userUuid)) {
            return Collections.emptyList();
        }
        Set<String> vendorKeys = resolveVendorOrgKeys(requestInfo, tenantId, userUuid.trim());
        Set<String> assetIds = searchAssetIdsByVendorKeys(requestInfo, tenantId, vendorKeys);
        log.info("Resolved {} mapped asset(s) for vendor user={} tenantId={}", assetIds.size(), userUuid, tenantId);
        return new ArrayList<>(assetIds);
    }

    private Set<String> resolveVendorOrgKeys(RequestInfo requestInfo, String tenantId, String userUuid) {
        Set<String> keys = new LinkedHashSet<>();
        keys.add(userUuid);

        if (StringUtils.isBlank(config.getVendorHost())) {
            log.warn("egov.vendor.host is not configured; vendor inbox scoped only by user uuid");
            return keys;
        }

        List<String> organisationIds = findOrganisationIdsByUserUuid(requestInfo, tenantId, userUuid);
        keys.addAll(organisationIds);
        for (String organisationId : organisationIds) {
            String code = findOrganisationCodeById(requestInfo, tenantId, organisationId);
            if (StringUtils.isNotBlank(code)) {
                keys.add(code.trim());
            }
        }
        return keys;
    }

    private List<String> findOrganisationIdsByUserUuid(RequestInfo requestInfo, String tenantId, String userUuid) {
        String uri = UriComponentsBuilder
                .fromUriString(config.getVendorHost() + config.getVendorOrganisationUserSearchPath())
                .queryParam("limit", 50)
                .queryParam("offset", 0)
                .queryParam("tenantId", tenantId)
                .toUriString();

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("userIds", Collections.singletonList(userUuid));

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", criteria);

        Map<String, Object> response = castToMap(serviceRequestRepository.fetchResult(new StringBuilder(uri), body));
        List<Map<String, Object>> orgUsers = castToListOfMaps(response.get("OrgUsers"));
        if (CollectionUtils.isEmpty(orgUsers)) {
            return Collections.emptyList();
        }

        List<String> organisationIds = new ArrayList<>();
        for (Map<String, Object> orgUser : orgUsers) {
            if (Boolean.TRUE.equals(orgUser.get("isDeleted"))) {
                continue;
            }
            Object organisationId = orgUser.get("organizationId");
            if (organisationId != null && StringUtils.isNotBlank(organisationId.toString())) {
                organisationIds.add(organisationId.toString());
            }
        }
        return organisationIds;
    }

    private String findOrganisationCodeById(RequestInfo requestInfo, String tenantId, String organisationId) {
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

    private Set<String> searchAssetIdsByVendorKeys(RequestInfo requestInfo, String tenantId, Set<String> vendorKeys) {
        Set<String> assetIds = new LinkedHashSet<>();
        if (CollectionUtils.isEmpty(vendorKeys) || StringUtils.isBlank(config.getAssetHost())) {
            return assetIds;
        }

        for (String vendorKey : vendorKeys) {
            if (StringUtils.isBlank(vendorKey)) {
                continue;
            }
            int offset = 0;
            while (true) {
                List<Map<String, Object>> page = searchAssetsPage(requestInfo, tenantId, vendorKey.trim(), offset);
                if (CollectionUtils.isEmpty(page)) {
                    break;
                }
                for (Map<String, Object> asset : page) {
                    Object assetId = asset.get("assetId");
                    if (assetId != null && StringUtils.isNotBlank(assetId.toString())) {
                        assetIds.add(assetId.toString().trim());
                    }
                }
                if (page.size() < ASSET_PAGE_SIZE) {
                    break;
                }
                offset += ASSET_PAGE_SIZE;
            }
        }
        return assetIds;
    }

    private List<Map<String, Object>> searchAssetsPage(
            RequestInfo requestInfo, String tenantId, String vendorId, int offset) {
        String uri = UriComponentsBuilder
                .fromUriString(config.getAssetHost() + config.getAssetSearchPath())
                .queryParam("limit", ASSET_PAGE_SIZE)
                .queryParam("offset", offset)
                .toUriString();

        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("vendorId", vendorId);

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("criteria", criteria);

        try {
            // asset-registry returns a bare JSON array (not a Map wrapper)
            List response = serviceRequestRepository.fetchListResult(new StringBuilder(uri), body);
            return castToListOfMaps(response);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to search assets for vendorId={} uri={}", vendorId, uri, e);
            throw new CustomException("ASSET_REGISTRY_ERROR",
                    "Failed to search assets for vendor scope: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castToMap(Object value) {
        if (value == null) {
            return Collections.emptyMap();
        }
        return objectMapper.convertValue(value, Map.class);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> castToListOfMaps(Object value) {
        if (value == null) {
            return Collections.emptyList();
        }
        return objectMapper.convertValue(value, List.class);
    }
}
