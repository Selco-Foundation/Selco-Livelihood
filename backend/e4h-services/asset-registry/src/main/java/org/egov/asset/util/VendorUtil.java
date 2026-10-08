package org.egov.asset.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.AssetVendor;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Resolves asset.vendorId to the vendor (user + organisation) from vendor-registry, for display.
 * asset.vendorId is normally a vendor organisation user's UUID; an organisation id is also accepted.
 * Two batched calls per search page (org users, then organisations). Failures are logged and leave
 * vendor null - search never fails because vendor-registry is unavailable.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class VendorUtil {

    private static final int BATCH_LIMIT = 1000;

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configuration;
    private final ObjectMapper objectMapper;

    public void attachVendors(RequestInfo requestInfo, String tenantId, List<Asset> assets) {
        if (CollectionUtils.isEmpty(assets)) {
            return;
        }
        List<Asset> allAssets = new ArrayList<>();
        for (Asset asset : assets) {
            allAssets.add(asset);
            if (asset.getChildren() != null) {
                allAssets.addAll(asset.getChildren());
            }
        }
        Set<String> vendorIds = new LinkedHashSet<>();
        allAssets.forEach(asset -> {
            if (StringUtils.isNotBlank(asset.getVendorId())) {
                vendorIds.add(asset.getVendorId().trim());
            }
        });
        if (vendorIds.isEmpty()) {
            return;
        }

        try {
            Map<String, AssetVendor> vendorsById = resolveVendors(requestInfo, tenantId, vendorIds);
            allAssets.forEach(asset -> {
                if (StringUtils.isNotBlank(asset.getVendorId())) {
                    asset.setVendor(vendorsById.get(asset.getVendorId().trim()));
                }
            });
        } catch (Exception e) {
            log.error("Failed to resolve vendors from vendor-registry for vendorIds={}", vendorIds, e);
        }
    }

    private Map<String, AssetVendor> resolveVendors(RequestInfo requestInfo, String tenantId, Set<String> vendorIds) {
        Map<String, AssetVendor> vendorsById = new HashMap<>();

        // 1. vendorId as an organisation user's UUID
        Map<String, Map<String, Object>> orgUsersByUserId = searchOrgUsers(requestInfo, tenantId, vendorIds);
        Set<String> organisationIds = new HashSet<>();
        orgUsersByUserId.values().forEach(orgUser -> {
            String organisationId = asString(orgUser.get("organizationId"));
            if (StringUtils.isNotBlank(organisationId)) {
                organisationIds.add(organisationId);
            }
        });
        // 2. any vendorId not found as a user may be an organisation id
        vendorIds.stream().filter(id -> !orgUsersByUserId.containsKey(id)).forEach(organisationIds::add);

        Map<String, Map<String, Object>> organisationsById = searchOrganisations(requestInfo, tenantId, organisationIds);

        for (String vendorId : vendorIds) {
            Map<String, Object> orgUser = orgUsersByUserId.get(vendorId);
            if (orgUser != null) {
                Map<String, Object> user = asMap(orgUser.get("user"));
                String organisationId = asString(orgUser.get("organizationId"));
                Map<String, Object> organisation = organisationsById.get(organisationId);
                AssetVendor.AssetVendorBuilder vendor = AssetVendor.builder()
                        .userId(vendorId)
                        .userName(asString(user.get("userName")))
                        .name(asString(user.get("name")))
                        .mobileNumber(asString(user.get("mobileNumber")))
                        .organisationId(organisationId);
                applyOrganisation(vendor, organisation);
                vendorsById.put(vendorId, vendor.build());
            } else if (organisationsById.containsKey(vendorId)) {
                AssetVendor.AssetVendorBuilder vendor = AssetVendor.builder().organisationId(vendorId);
                applyOrganisation(vendor, organisationsById.get(vendorId));
                vendorsById.put(vendorId, vendor.build());
            }
        }
        return vendorsById;
    }

    private void applyOrganisation(AssetVendor.AssetVendorBuilder vendor, Map<String, Object> organisation) {
        if (organisation == null) {
            return;
        }
        vendor.organisationName(asString(organisation.get("name")))
                .orgNumber(asString(organisation.get("orgNumber")))
                .applicationNumber(asString(organisation.get("applicationNumber")));
    }

    private Map<String, Map<String, Object>> searchOrgUsers(RequestInfo requestInfo, String tenantId, Set<String> userIds) {
        StringBuilder url = new StringBuilder(configuration.getVendorHost())
                .append(configuration.getVendorOrgUserSearchPath())
                .append("?tenantId=").append(tenantId)
                .append("&limit=").append(BATCH_LIMIT)
                .append("&offset=0");
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("userIds", new ArrayList<>(userIds));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", criteria);

        Map<String, Map<String, Object>> byUserId = new HashMap<>();
        for (Object item : asList(asMap(serviceRequestRepository.fetchResult(url, body, Map.class)).get("OrgUsers"))) {
            Map<String, Object> orgUser = asMap(item);
            if (Boolean.TRUE.equals(orgUser.get("isDeleted"))) {
                continue;
            }
            String userId = asString(orgUser.get("userId"));
            if (StringUtils.isBlank(userId)) {
                userId = asString(asMap(orgUser.get("user")).get("uuid"));
            }
            if (StringUtils.isNotBlank(userId)) {
                byUserId.putIfAbsent(userId, orgUser);
            }
        }
        return byUserId;
    }

    private Map<String, Map<String, Object>> searchOrganisations(RequestInfo requestInfo, String tenantId, Set<String> organisationIds) {
        Map<String, Map<String, Object>> byId = new HashMap<>();
        if (organisationIds.isEmpty()) {
            return byId;
        }
        StringBuilder url = new StringBuilder(configuration.getVendorHost())
                .append(configuration.getVendorOrgSearchPath());
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("ids", new ArrayList<>(organisationIds));
        Map<String, Object> pagination = new HashMap<>();
        pagination.put("limit", BATCH_LIMIT);
        pagination.put("offset", 0);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("SearchCriteria", criteria);
        body.put("Pagination", pagination);

        for (Object item : asList(asMap(serviceRequestRepository.fetchResult(url, body, Map.class)).get("organisations"))) {
            Map<String, Object> organisation = asMap(item);
            String id = asString(organisation.get("id"));
            if (StringUtils.isNotBlank(id)) {
                byId.put(id, organisation);
            }
        }
        return byId;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return value == null ? new HashMap<>() : objectMapper.convertValue(value, Map.class);
    }

    private List<?> asList(Object value) {
        return value instanceof List ? (List<?>) value : List.of();
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
