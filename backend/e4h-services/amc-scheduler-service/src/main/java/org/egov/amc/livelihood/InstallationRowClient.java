package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Reads SOLAR installation rows (facility_activities) from the installation service, in one batched
 * call: POST /activity/v1/activities/_search?tenantId&limit&offset {ActivityFacility:{tenantId, ids}}.
 * Deleted rows are not returned by that search, so a missing id = unknown or deleted (LLD §6.3).
 */
@Slf4j
@Component
public class InstallationRowClient {

    /** One installation row as the AMC layer needs it. completedAt is 0 until the QC reviewer approves. */
    public record InstallationRow(String id, String tenantId, String facilityId, String projectId, String fieldPlanId,
                                  String componentType, String status, long completedAt) {
        public boolean isSolar() {
            return LivelihoodAmc.COMPONENT_SOLAR.equalsIgnoreCase(componentType);
        }

        public boolean isApproved() {
            return LivelihoodAmc.INSTALLATION_APPROVED.equalsIgnoreCase(status);
        }
    }

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;
    private final ObjectMapper mapper;

    public InstallationRowClient(AMCServiceConfiguration config, ServiceRequestRepository requestRepository,
                                 @Qualifier("objectMapper") ObjectMapper mapper) {
        this.config = config;
        this.requestRepository = requestRepository;
        this.mapper = mapper;
    }

    public Map<String, InstallationRow> findByIds(Collection<String> ids, String tenantId, RequestInfo requestInfo) {
        if (ids == null || ids.isEmpty()) {
            return Map.of();
        }
        List<String> distinct = new ArrayList<>(new java.util.LinkedHashSet<>(ids));
        StringBuilder url = new StringBuilder(config.getFieldPlannerActivityHost())
                .append(config.getFieldPlannerActivitySearchUrl())
                .append("?tenantId=").append(tenantId)
                .append("&limit=").append(Math.max(distinct.size(), 1))
                .append("&offset=0");
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("ids", distinct);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("ActivityFacility", criteria);
        Object response = requestRepository.fetchResult(url, body);
        return parse(mapper.valueToTree(response));
    }

    /** Response: {facility:[{activityFacility:{id, facilityId, fieldPlanId, fieldPlan:{projectId}, componentType, status, completedAt}}]} */
    static Map<String, InstallationRow> parse(JsonNode root) {
        Map<String, InstallationRow> rows = new HashMap<>();
        if (root == null || !root.path("facility").isArray()) {
            return rows;
        }
        for (JsonNode wrapper : root.path("facility")) {
            JsonNode af = wrapper.has("activityFacility") ? wrapper.path("activityFacility") : wrapper;
            String id = text(af, "id");
            if (id == null) {
                continue;
            }
            if (af.path("isDeleted").asBoolean(false)) {
                continue;
            }
            rows.put(id, new InstallationRow(id, text(af, "tenantId"), text(af, "facilityId"),
                    text(af.path("fieldPlan"), "projectId"), text(af, "fieldPlanId"),
                    text(af, "componentType"), text(af, "status"), af.path("completedAt").asLong(0L)));
        }
        return rows;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node == null ? null : node.get(field);
        return v == null || v.isNull() || v.asText().isBlank() ? null : v.asText();
    }
}
