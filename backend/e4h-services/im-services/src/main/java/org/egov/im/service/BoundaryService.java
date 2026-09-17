package org.egov.im.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.im.config.IMConfiguration;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.web.models.Boundary;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class BoundaryService {

    @Autowired
    private IMConfiguration config;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private LivelihoodTenantUtil livelihoodTenantUtil;

    /**
     * Enriches boundary hierarchy from boundary-service for indexing and inbox jurisdiction filters.
     */
    public Boundary fetchBoundaryFromBoundaryCode(RequestInfo requestInfo, String boundaryCode, String tenantId) {
        return fetchBoundaryFromBoundaryCode(requestInfo, boundaryCode, tenantId, null);
    }

    /**
     * @param assetId optional; used to derive facility boundary when {@code boundaryCode} is asset-level
     */
    public Boundary fetchBoundaryFromBoundaryCode(
            RequestInfo requestInfo,
            String boundaryCode,
            String tenantId,
            String assetId
    ) {
        if (StringUtils.isBlank(boundaryCode)) {
            log.debug("No boundaryCode provided, skipping boundary enrichment");
            return null;
        }

        if (livelihoodTenantUtil.isLivelihood(tenantId)) {
            Boundary assetHierarchy = searchBoundaryHierarchy(requestInfo, boundaryCode, tenantId, "Asset");
            if (hasFacilityCode(assetHierarchy)) {
                log.debug("Resolved Livelihood boundary hierarchy from asset code {}", boundaryCode);
                return assetHierarchy;
            }

            String facilityBoundaryCode = resolveFacilityBoundaryCode(boundaryCode, assetId);
            if (StringUtils.isNotBlank(facilityBoundaryCode) && !facilityBoundaryCode.equals(boundaryCode)) {
                Boundary facilityHierarchy = searchBoundaryHierarchy(
                        requestInfo, facilityBoundaryCode, tenantId, "Facility"
                );
                if (hasFacilityCode(facilityHierarchy)) {
                    log.debug("Resolved Livelihood boundary hierarchy from facility code {}", facilityBoundaryCode);
                    return facilityHierarchy;
                }
            }

            Boundary legacyHierarchy = searchBoundaryHierarchy(requestInfo, boundaryCode, tenantId, "Facility");
            if (hasFacilityCode(legacyHierarchy)) {
                return legacyHierarchy;
            }

            log.warn("Could not resolve Livelihood boundary hierarchy for code={} assetId={}", boundaryCode, assetId);
            return null;
        }

        return searchBoundaryHierarchy(requestInfo, boundaryCode, tenantId, "Facility");
    }

    private Boundary searchBoundaryHierarchy(
            RequestInfo requestInfo,
            String boundaryCode,
            String tenantId,
            String boundaryType
    ) {
        try {
            UriComponentsBuilder uriBuilder = UriComponentsBuilder
                    .fromHttpUrl(config.getBoundaryHost() + config.getBoundarySearchPath())
                    .queryParam("tenantId", tenantId != null ? tenantId.split("\\.")[0] : "")
                    .queryParam("codes", boundaryCode)
                    .queryParam("includeParents", "true");

            if (StringUtils.isNotBlank(boundaryType)) {
                uriBuilder.queryParam("boundaryType", boundaryType);
            }
            if (livelihoodTenantUtil.isLivelihood(tenantId)) {
                uriBuilder.queryParam("hierarchyType", config.getBoundaryHierarchyType());
            }

            String url = uriBuilder.toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("RequestInfo", requestInfo);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> responseEntity = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );

            Map<String, Object> responseMap = responseEntity.getBody();
            if (responseMap == null) {
                return null;
            }

            List<Map<String, Object>> boundaryRelationships = (List<Map<String, Object>>) responseMap.get("TenantBoundary");
            if (boundaryRelationships == null || boundaryRelationships.isEmpty()) {
                log.warn("No boundary relationships found for boundaryCode={} boundaryType={}", boundaryCode, boundaryType);
                return null;
            }

            Map<String, Object> tenantBoundary = boundaryRelationships.get(0);
            List<Map<String, Object>> boundaries = (List<Map<String, Object>>) tenantBoundary.get("boundary");
            if (boundaries == null || boundaries.isEmpty()) {
                log.warn("No boundaries found in response for boundaryCode={} boundaryType={}", boundaryCode, boundaryType);
                return null;
            }

            Boundary boundary = buildBoundaryHierarchy(boundaries);
            if (hasFacilityCode(boundary)) {
                log.debug("Enriched boundary hierarchy for boundaryCode={} boundaryType={}", boundaryCode, boundaryType);
            }
            return boundary;
        } catch (Exception e) {
            log.error("Error enriching boundary details for boundaryCode={} boundaryType={}", boundaryCode, boundaryType, e);
            return null;
        }
    }

    static String resolveFacilityBoundaryCode(String boundaryCode, String assetId) {
        if (StringUtils.isBlank(boundaryCode)) {
            return boundaryCode;
        }
        if (StringUtils.isNotBlank(assetId)) {
            String suffix = "_" + assetId.trim();
            if (boundaryCode.endsWith(suffix)) {
                return boundaryCode.substring(0, boundaryCode.length() - suffix.length());
            }
        }
        return boundaryCode;
    }

    private boolean hasFacilityCode(Boundary boundary) {
        return boundary != null && StringUtils.isNotBlank(boundary.getFacilityCode());
    }

    private Boundary buildBoundaryHierarchy(List<Map<String, Object>> boundaries) {
        Boundary boundary = new Boundary();

        for (Map<String, Object> boundaryItem : boundaries) {
            applyBoundaryNode(boundary, boundaryItem);

            List<Map<String, Object>> children = (List<Map<String, Object>>) boundaryItem.get("children");
            if (children != null && !children.isEmpty()) {
                Boundary childBoundary = buildBoundaryHierarchy(children);
                mergeBoundaryHierarchy(boundary, childBoundary);
            }
        }

        return boundary;
    }

    private void applyBoundaryNode(Boundary boundary, Map<String, Object> boundaryItem) {
        String code = (String) boundaryItem.get("code");
        String boundaryType = (String) boundaryItem.get("boundaryType");
        if (code == null || boundaryType == null) {
            return;
        }

        switch (boundaryType.toLowerCase()) {
            case "country":
                boundary.setCountryCode(code);
                break;
            case "state":
                boundary.setStateCode(code);
                break;
            case "district":
                boundary.setDistrictCode(code);
                break;
            case "block":
                boundary.setBlockCode(code);
                break;
            case "facility":
                boundary.setFacilityCode(code);
                break;
            default:
                log.debug("Skipping boundaryType {} for hierarchy enrichment", boundaryType);
        }
    }

    private void mergeBoundaryHierarchy(Boundary target, Boundary source) {
        if (source.getCountryCode() != null) {
            target.setCountryCode(source.getCountryCode());
        }
        if (source.getStateCode() != null) {
            target.setStateCode(source.getStateCode());
        }
        if (source.getDistrictCode() != null) {
            target.setDistrictCode(source.getDistrictCode());
        }
        if (source.getBlockCode() != null) {
            target.setBlockCode(source.getBlockCode());
        }
        if (source.getFacilityCode() != null) {
            target.setFacilityCode(source.getFacilityCode());
        }
    }
}
