package org.selco.e4h.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.minidev.json.JSONArray;
import org.egov.common.contract.request.RequestInfo;
import org.selco.e4h.config.LivelihoodSummaryProperties;
import org.selco.e4h.util.MdmsUtil;
import org.selco.e4h.web.models.EscalationLevel;
import org.selco.e4h.web.models.EscalationRecipient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service to fetch escalation master data from MDMS
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EscalationMasterDataService {
    
    private final MdmsUtil mdmsUtil;
    private final ObjectMapper objectMapper;
    private final LivelihoodSummaryProperties livelihoodProperties;
    
    private static final String INCIDENT_MODULE = "Incident";
    private static final String TENANT_MODULE = "tenant";
    private static final String ESCALATION_LEVEL_MASTER = "EscalationLevel";
    private static final String ESCALATION_RECIPIENT_MASTER = "EscalationRecipient";
    private static final String TENANT_MASTER = "tenants";
    private static final String COMMON_MASTERS_MODULE = "common-masters";
    private static final String STATE_INFO_MASTER = "StateInfo";
    private static final String E4H_MDMS_TENANT = "in";

    private String mdmsTenantId() {
        return livelihoodProperties.getMdmsTenantId();
    }

    /**
     * Tenant id used on notification / filestore payloads (always livelihood in Livelihood deployment).
     */
    public String resolveNotificationTenantId(String loopKey) {
        if (livelihoodProperties.isLivelihoodDeployment()) {
            return livelihoodProperties.getLivelihoodTenantId();
        }
        return loopKey;
    }
    
    /**
     * Fetch all escalation levels from MDMS
     */
    public List<EscalationLevel> fetchEscalationLevels(RequestInfo requestInfo) {
        try {
            log.info("Fetching escalation levels from MDMS tenant={}", mdmsTenantId());
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                requestInfo, 
                mdmsTenantId(), 
                INCIDENT_MODULE, 
                List.of(ESCALATION_LEVEL_MASTER)
            );
            
            JSONArray escalationLevels = mdmsData.get(INCIDENT_MODULE).get(ESCALATION_LEVEL_MASTER);
            if (escalationLevels != null && !escalationLevels.isEmpty()) {
                try {
                    return objectMapper.convertValue(escalationLevels, new TypeReference<List<EscalationLevel>>() {});
                } catch (Exception conversionError) {
                    log.error("Error converting escalation levels JSONArray to List<EscalationLevel>", conversionError);
                    log.debug("Escalation levels JSONArray content: {}", escalationLevels);
                    return new ArrayList<>();
                }
            }
            
            log.warn("No escalation levels found in MDMS");
            return new ArrayList<>();
            
        } catch (Exception e) {
            log.error("Error fetching escalation levels from MDMS", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Fetch all escalation recipients from MDMS
     */
    public List<EscalationRecipient> fetchEscalationRecipients(RequestInfo requestInfo) {
        try {
            log.info("Fetching escalation recipients from MDMS tenant={}", mdmsTenantId());
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                requestInfo, 
                mdmsTenantId(), 
                INCIDENT_MODULE, 
                List.of(ESCALATION_RECIPIENT_MASTER)
            );
            
            JSONArray escalationRecipients = mdmsData.get(INCIDENT_MODULE).get(ESCALATION_RECIPIENT_MASTER);
            if (escalationRecipients != null && !escalationRecipients.isEmpty()) {
                try {
                    List<EscalationRecipient> recipients = objectMapper.convertValue(escalationRecipients, new TypeReference<List<EscalationRecipient>>() {});
                    
                    // Sort by ID to ensure correct processing order (1-7, not 7-1)
                    recipients.sort((a, b) -> {
                        if (a.getId() == null && b.getId() == null) return 0;
                        if (a.getId() == null) return 1;
                        if (b.getId() == null) return -1;
                        return a.getId().compareTo(b.getId());
                    });
                    
                    log.info("Fetched {} escalation recipients, sorted by ID: {}", 
                        recipients.size(), recipients.stream().map(EscalationRecipient::getId).toList());
                    
                    return recipients;
                } catch (Exception conversionError) {
                    log.error("Error converting escalation recipients JSONArray to List<EscalationRecipient>", conversionError);
                    log.debug("Escalation recipients JSONArray content: {}", escalationRecipients);
                    return new ArrayList<>();
                }
            }
            
            log.warn("No escalation recipients found in MDMS");
            return new ArrayList<>();
            
        } catch (Exception e) {
            log.error("Error fetching escalation recipients from MDMS", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Fetch active state codes for Livelihood escalation from MDMS common-masters.StateInfo.
     * Only rows with active=true are included (e.g. KA / Karnataka only).
     */
    public List<String> fetchActiveTenantIds(RequestInfo requestInfo) {
        if (livelihoodProperties.isLivelihoodDeployment()) {
            Map<String, String> stateMap = fetchLivelihoodActiveStateInfo(requestInfo);
            List<String> stateCodes = new ArrayList<>(stateMap.keySet());
            stateCodes.sort(String::compareToIgnoreCase);
            log.info("Livelihood escalation: using {} active StateInfo row(s) from MDMS: {}",
                    stateCodes.size(), stateCodes);
            return stateCodes;
        }
        return fetchE4hActiveTenantIds(requestInfo);
    }

    private Map<String, String> fetchLivelihoodActiveStateInfo(RequestInfo requestInfo) {
        Map<String, String> stateMap = new LinkedHashMap<>();
        try {
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                    requestInfo,
                    mdmsTenantId(),
                    COMMON_MASTERS_MODULE,
                    List.of(STATE_INFO_MASTER)
            );

            JSONArray stateInfoRows = mdmsData
                    .getOrDefault(COMMON_MASTERS_MODULE, Map.of())
                    .get(STATE_INFO_MASTER);

            if (stateInfoRows == null || stateInfoRows.isEmpty()) {
                log.warn("No StateInfo found in MDMS for tenant={}", mdmsTenantId());
                return stateMap;
            }

            for (Object rowObj : stateInfoRows) {
                if (!(rowObj instanceof Map<?, ?> row)) {
                    continue;
                }
                if (!isStateInfoActive(row)) {
                    continue;
                }
                String code = stringValue(row.get("code"));
                String boundaryCode = stringValue(row.get("boundaryCode"));
                if (!isNonEmpty(code) || !isNonEmpty(boundaryCode)) {
                    log.warn("Skipping StateInfo row with missing code/boundaryCode: {}", row);
                    continue;
                }
                stateMap.put(code, normalizeStateBoundaryCode(boundaryCode));
                log.debug("Added active StateInfo: {} -> {}", code, stateMap.get(code));
            }
        } catch (Exception e) {
            log.error("Error fetching StateInfo from MDMS for tenant={}", mdmsTenantId(), e);
        }
        return stateMap;
    }

    private boolean isStateInfoActive(Map<?, ?> row) {
        Object active = row.get("active");
        if (active instanceof Boolean bool) {
            return bool;
        }
        if (active != null) {
            return Boolean.parseBoolean(active.toString());
        }
        return false;
    }

    private String stringValue(Object value) {
        return value != null ? value.toString().trim() : null;
    }

    private List<String> fetchE4hActiveTenantIds(RequestInfo requestInfo) {
        try {
            log.info("Fetching active tenant IDs from MDMS");
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                requestInfo, 
                E4H_MDMS_TENANT, 
                TENANT_MODULE, 
                List.of(TENANT_MASTER)
            );
            
            JSONArray tenants = mdmsData.get(TENANT_MODULE).get(TENANT_MASTER);
            if (tenants != null && !tenants.isEmpty()) {
                List<String> activeTenantIds = new ArrayList<>();
                
                for (Object tenantObj : tenants) {
                    try {
                        Map<String, Object> tenant = (Map<String, Object>) tenantObj;
                        
                        // Extract tenant code (ID) from the tenant object
                        String tenantId = (String) tenant.get("code");
                        if (tenantId != null && !tenantId.trim().isEmpty()) {
                            // Only include state-level tenants (exclude 'in' which is country-level)
                            if (!tenantId.startsWith("in")) {
                                activeTenantIds.add(tenantId);
                                log.debug("Added tenant: {}", tenantId);
                            } else {
                                log.debug("Skipping country-level tenant: {}", tenantId);
                            }
                        } else {
                            log.warn("Tenant object missing 'code' field: {}", tenantObj);
                        }
                    } catch (Exception e) {
                        log.warn("Error processing tenant object: {}", tenantObj, e);
                    }
                }
                
                log.info("Found {} active state-level tenants: {}", activeTenantIds.size(), activeTenantIds);
                return activeTenantIds;
            }
            
            log.warn("No tenants found in MDMS");
            return new ArrayList<>();
            
        } catch (Exception e) {
            log.error("Error fetching tenants from MDMS", e);
            return new ArrayList<>();
        }
    }

    // Allow to get boundary for each state base
    public Map<String, String> getActiveTenantIdsName(RequestInfo requestInfo) {
        if (livelihoodProperties.isLivelihoodDeployment()) {
            Map<String, String> stateMap = fetchLivelihoodActiveStateInfo(requestInfo);
            log.info("Livelihood escalation state map from StateInfo: {}", stateMap);
            return stateMap;
        }
        return fetchE4hActiveTenantIdsName(requestInfo);
    }

    private Map<String, String> fetchE4hActiveTenantIdsName(RequestInfo requestInfo) {
        log.info("Fetching active tenant IDs from MDMS");

        try {
            Map<String, Map<String, JSONArray>> mdmsData = mdmsUtil.fetchMdmsData(
                    requestInfo,
                    E4H_MDMS_TENANT,
                    TENANT_MODULE,
                    List.of(TENANT_MASTER)
            );

            JSONArray tenants = mdmsData
                    .getOrDefault(TENANT_MODULE, Map.of())
                    .get(TENANT_MASTER);

            if (tenants == null || tenants.isEmpty()) {
                log.warn("No tenants found in MDMS");
                return Map.of();
            }

            Map<String, String> tenantMap = new HashMap<>();

            for (Object tenantObj : tenants) {
                processTenant(tenantObj, tenantMap);
            }

            log.info("Found {} active state-level tenants: {}", tenantMap.size(), tenantMap);
            return tenantMap;

        } catch (Exception e) {
            log.error("Error fetching tenants from MDMS", e);
            return Map.of();
        }
    }

    @SuppressWarnings("unchecked")
    private void processTenant(Object tenantObj, Map<String, String> tenantMap) {
        if (!(tenantObj instanceof Map)) {
            log.warn("Invalid tenant object format: {}", tenantObj);
            return;
        }

        Map<String, Object> tenant = (Map<String, Object>) tenantObj;
        String tenantId = (String) tenant.get("code");
        String tenantName = (String) tenant.get("name");

        if (!isValidTenant(tenantId, tenantName)) {
            log.warn("Tenant object missing required fields: {}", tenantObj);
            return;
        }

        if (tenantId.startsWith("in")) {
            log.debug("Skipping country-level tenant: {}", tenantId);
            return;
        }

        tenantMap.put(tenantId, "India_" + tenantName);
        log.debug("Added tenant: {} with name {}", tenantId, tenantName);
    }

    private boolean isValidTenant(String tenantId, String tenantName) {
        return isNonEmpty(tenantId) && isNonEmpty(tenantName);
    }

    private boolean isNonEmpty(String value) {
        return value != null && !value.trim().isEmpty();
    }

    /**
     * Normalizes HRMS/MDMS state boundary to ES stateCode prefix (e.g. INDIA_KARNATAKA → India_Karnataka).
     */
    static String normalizeStateBoundaryCode(String boundary) {
        if (boundary == null || boundary.isBlank()) {
            return boundary;
        }
        String trimmed = boundary.trim();
        if (trimmed.contains("_")) {
            String[] parts = trimmed.split("_");
            if (parts.length >= 2) {
                return capitalizeSegment(parts[0]) + "_" + capitalizeSegment(parts[1]);
            }
        }
        return trimmed;
    }

    private static String capitalizeSegment(String segment) {
        if (segment == null || segment.isEmpty()) {
            return segment;
        }
        if (segment.length() == 1) {
            return segment.toUpperCase();
        }
        return segment.substring(0, 1).toUpperCase() + segment.substring(1).toLowerCase();
    }
    
}
