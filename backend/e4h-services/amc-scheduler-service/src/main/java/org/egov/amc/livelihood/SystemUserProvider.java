package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.common.contract.request.User;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The shared system account the service acts as for steps no person may take (SCHEDULE, AUTO_APPROVE,
 * RESET_FOR_REASSIGNMENT, the reminder job), LLD 07 §8.3. Looked up by username (default CRONJOB) and
 * cached. Several accounts can share the username (dev has two), so only one holding SYSTEM_USER on the
 * state tenant is used. Never invents a user: if none is found the caller's action fails.
 */
@Slf4j
@Component
public class SystemUserProvider {

    public static final String AMC_SYSTEM_USER_NOT_FOUND = "AMC_SYSTEM_USER_NOT_FOUND";
    static final String SYSTEM_USER_ROLE = "SYSTEM_USER";

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;
    private final ObjectMapper mapper;
    private volatile User cached;

    public SystemUserProvider(AMCServiceConfiguration config, ServiceRequestRepository requestRepository,
                              @Qualifier("objectMapper") ObjectMapper mapper) {
        this.config = config;
        this.requestRepository = requestRepository;
        this.mapper = mapper;
    }

    /** RequestInfo acting as the system user. */
    public RequestInfo requestInfo() {
        return RequestInfo.builder().apiId("amc-service").userInfo(user()).build();
    }

    public User user() {
        User u = cached;
        if (u == null) {
            synchronized (this) {
                if (cached == null) {
                    cached = load();
                }
                u = cached;
            }
        }
        return u;
    }

    private User load() {
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", RequestInfo.builder().apiId("amc-service").build());
        body.put("userName", config.getSystemUserName());
        body.put("tenantId", config.getStateTenantId());
        Object response;
        try {
            response = requestRepository.fetchResult(
                    new StringBuilder(config.getUserHost()).append(config.getUserSearchPath()), body);
        } catch (Exception e) {
            log.error("System user lookup failed for {}: {}", config.getSystemUserName(), e.getMessage());
            throw new CustomException(AMC_SYSTEM_USER_NOT_FOUND, "The AMC system user could not be looked up");
        }
        User user = pick(mapper.valueToTree(response), config.getStateTenantId());
        if (user == null) {
            log.error("No user '{}' with role {} on tenant {}", config.getSystemUserName(), SYSTEM_USER_ROLE,
                    config.getStateTenantId());
            throw new CustomException(AMC_SYSTEM_USER_NOT_FOUND,
                    "No system user '" + config.getSystemUserName() + "' with role " + SYSTEM_USER_ROLE);
        }
        log.info("AMC system user resolved: {} ({})", user.getUserName(), user.getUuid());
        return user;
    }

    /** The first active account in the egov-user response holding SYSTEM_USER on the tenant. */
    static User pick(JsonNode root, String tenantId) {
        JsonNode users = root == null ? null : root.get("user");
        if (users == null || !users.isArray()) {
            return null;
        }
        for (JsonNode u : users) {
            if (u.has("active") && !u.path("active").asBoolean(true)) {
                continue;
            }
            List<Role> roles = new ArrayList<>();
            boolean hasSystemUser = false;
            for (JsonNode r : u.path("roles")) {
                String code = r.path("code").asText(null);
                String roleTenant = r.path("tenantId").asText(tenantId);
                if (code == null) {
                    continue;
                }
                roles.add(Role.builder().code(code).name(r.path("name").asText(code)).tenantId(roleTenant).build());
                if (SYSTEM_USER_ROLE.equals(code) && tenantId.equals(roleTenant)) {
                    hasSystemUser = true;
                }
            }
            if (hasSystemUser) {
                return User.builder()
                        .id(u.path("id").isNumber() ? u.path("id").asLong() : null)
                        .uuid(u.path("uuid").asText(null))
                        .userName(u.path("userName").asText(null))
                        .name(u.path("name").asText(null))
                        .type(u.path("type").asText("SYSTEM"))
                        .tenantId(u.path("tenantId").asText(tenantId))
                        .roles(roles)
                        .build();
            }
        }
        return null;
    }
}
