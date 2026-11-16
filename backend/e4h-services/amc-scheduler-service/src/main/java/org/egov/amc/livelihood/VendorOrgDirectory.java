package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * vendor-registry look-ups for the AMC vendor org and its field staff (LLD §6.3, §6.6):
 * organisations by id (type VENDOR, active) and org members with their roles. One call each per request.
 */
@Component
public class VendorOrgDirectory {

    public record VendorOrg(String id, String orgType, boolean active) {
        public boolean isActiveVendor() {
            return active && LivelihoodAmc.ORG_TYPE_VENDOR.equalsIgnoreCase(orgType);
        }
    }

    public record OrgMember(String orgId, String userId, boolean deleted, Set<String> roles) {
        public boolean hasRole(String role) {
            return roles != null && roles.stream().anyMatch(r -> r.equalsIgnoreCase(role));
        }
    }

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;
    private final ObjectMapper mapper;

    public VendorOrgDirectory(AMCServiceConfiguration config, ServiceRequestRepository requestRepository,
                              @Qualifier("objectMapper") ObjectMapper mapper) {
        this.config = config;
        this.requestRepository = requestRepository;
        this.mapper = mapper;
    }

    /** POST /vendor/organisation/v1/_search {SearchCriteria:{tenantId, ids}} -> id -> org */
    public Map<String, VendorOrg> findOrgs(Collection<String> orgIds, String tenantId, RequestInfo requestInfo) {
        List<String> ids = distinctNonBlank(orgIds);
        if (ids.isEmpty()) {
            return Map.of();
        }
        StringBuilder url = new StringBuilder(config.getVendorHost()).append(config.getVendorSearchUrl())
                .append("?tenantId=").append(tenantId).append("&limit=").append(ids.size()).append("&offset=0");
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("ids", ids);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("SearchCriteria", criteria);
        return parseOrgs(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    /** POST /vendor/organisation/v1/user/_search {OrgUser:{tenantId, organizationIds, userIds}} -> "orgId|userId" -> member */
    public Map<String, OrgMember> findMembers(Collection<String> orgIds, Collection<String> userIds, String tenantId,
                                              RequestInfo requestInfo) {
        List<String> orgs = distinctNonBlank(orgIds);
        List<String> users = distinctNonBlank(userIds);
        if (orgs.isEmpty() || users.isEmpty()) {
            return Map.of();
        }
        StringBuilder url = new StringBuilder(config.getVendorHost()).append(config.getVendorOrgUserSearchUrl())
                .append("?tenantId=").append(tenantId).append("&limit=").append(Math.max(users.size() * orgs.size(), 10))
                .append("&offset=0");
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("organizationIds", orgs);
        criteria.put("userIds", users);
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("OrgUser", criteria);
        return parseMembers(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    public static String memberKey(String orgId, String userId) {
        return orgId + "|" + userId;
    }

    static Map<String, VendorOrg> parseOrgs(JsonNode root) {
        Map<String, VendorOrg> out = new HashMap<>();
        JsonNode list = root == null ? null : (root.has("organisations") ? root.get("organisations") : root.get("Organisations"));
        if (list == null || !list.isArray()) {
            return out;
        }
        for (JsonNode o : list) {
            String id = o.path("id").asText(null);
            if (id != null) {
                out.put(id, new VendorOrg(id, o.path("orgType").asText(null), o.path("isActive").asBoolean(false)));
            }
        }
        return out;
    }

    static Map<String, OrgMember> parseMembers(JsonNode root) {
        Map<String, OrgMember> out = new HashMap<>();
        JsonNode list = root == null ? null : root.get("OrgUsers");
        if (list == null || !list.isArray()) {
            return out;
        }
        for (JsonNode m : list) {
            String orgId = m.path("organizationId").asText(null);
            String userId = m.path("userId").asText(null);
            if (orgId == null || userId == null) {
                continue;
            }
            Set<String> roles = new HashSet<>();
            JsonNode r = m.has("roles") ? m.get("roles") : m.path("user").path("roles");
            if (r != null && r.isArray()) {
                for (JsonNode role : r) {
                    String code = role.isTextual() ? role.asText() : role.path("code").asText(null);
                    if (code != null) {
                        roles.add(code);
                    }
                }
            }
            boolean deleted = m.path("isDeleted").asBoolean(false);
            // Keep a live membership over a deleted one if vendor-registry returns both.
            out.merge(memberKey(orgId, userId), new OrgMember(orgId, userId, deleted, roles),
                    (a, b) -> a.deleted() ? b : a);
        }
        return out;
    }

    private static List<String> distinctNonBlank(Collection<String> values) {
        List<String> out = new ArrayList<>();
        if (values != null) {
            for (String v : new LinkedHashSet<>(values)) {
                if (v != null && !v.isBlank()) {
                    out.add(v);
                }
            }
        }
        return out;
    }
}
