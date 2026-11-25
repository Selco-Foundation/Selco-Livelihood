package org.egov.amc.livelihood;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Finds the SOLAR asset of an installation row in asset-registry (LLD 07 §6.3): the asset with type SOLAR and
 * no parent; its children are BATTERY / INVERTER / PANEL. Older rows have no SOLAR asset (only loose
 * components), so their AMC is not activated (checked on dev 2026-11-16).
 * POST /asset-registry/v1/asset/_search?tenantId&limit&offset {criteria:{tenantId, activityFacilityID}} -> [assets]
 */
@Component
public class SolarAssetClient {

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;

    public SolarAssetClient(AMCServiceConfiguration config, ServiceRequestRepository requestRepository) {
        this.config = config;
        this.requestRepository = requestRepository;
    }

    /** The SOLAR asset id of the row, or null when there is none. */
    public String findSolarAssetId(String activityFacilityId, String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("activityFacilityID", activityFacilityId);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("criteria", criteria);
        StringBuilder url = new StringBuilder(config.getAssetServiceHost()).append(config.getAssetServiceSearchUrl())
                .append("?tenantId=").append(tenantId).append("&limit=100&offset=0");
        // asset-registry answers with a JSON array, so read it as a tree (the Map variant would fail).
        JsonNode response = requestRepository.fetchResult(url, body, new TypeReference<JsonNode>() {});
        return pickSolar(response);
    }

    static String pickSolar(JsonNode root) {
        JsonNode list = root == null ? null : (root.isArray() ? root : root.get("assets"));
        if (list == null || !list.isArray()) {
            return null;
        }
        for (JsonNode a : list) {
            boolean solar = LivelihoodAmc.COMPONENT_SOLAR.equalsIgnoreCase(a.path("assetTypeID").asText(""));
            boolean topLevel = a.path("parentId").isMissingNode() || a.path("parentId").isNull()
                    || a.path("parentId").asText("").isBlank();
            boolean active = !a.has("isActive") || a.path("isActive").asBoolean(true);
            if (solar && topLevel && active) {
                return a.path("assetId").asText(null);
            }
        }
        return null;
    }
}
