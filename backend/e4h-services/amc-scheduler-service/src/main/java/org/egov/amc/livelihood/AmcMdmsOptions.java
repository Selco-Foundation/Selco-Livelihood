package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.config.AMCServiceConfiguration;
import org.egov.amc.service.ServiceRequestRepository;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** Active AMC frequency (months) and duration (years) options from MDMS AMC.Frequency / AMC.Duration (LLD §8.2). */
@Component
public class AmcMdmsOptions {

    public record Options(Set<Integer> frequencyMonths, Set<Integer> durationYears) {
    }

    private final AMCServiceConfiguration config;
    private final ServiceRequestRepository requestRepository;
    private final ObjectMapper mapper;

    public AmcMdmsOptions(AMCServiceConfiguration config, ServiceRequestRepository requestRepository,
                          @Qualifier("objectMapper") ObjectMapper mapper) {
        this.config = config;
        this.requestRepository = requestRepository;
        this.mapper = mapper;
    }

    public Options load(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC",
                "masterDetails", List.of(Map.of("name", "Frequency"), Map.of("name", "Duration")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return parse(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    /** Days before the due date a first report may be submitted (MDMS AMC.Config.submissionWindowDays; LLD §6.4). */
    public static final int DEFAULT_SUBMISSION_WINDOW_DAYS = 30;

    public int submissionWindowDays(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC", "masterDetails", List.of(Map.of("name", "Config")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return parseSubmissionWindowDays(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    static int parseSubmissionWindowDays(JsonNode root) {
        JsonNode list = root == null ? null : root.path("MdmsRes").path("AMC").path("Config");
        if (list != null && list.isArray() && !list.isEmpty() && list.get(0).path("submissionWindowDays").canConvertToInt()) {
            int days = list.get(0).path("submissionWindowDays").asInt();
            return days >= 0 ? days : DEFAULT_SUBMISSION_WINDOW_DAYS;
        }
        return DEFAULT_SUBMISSION_WINDOW_DAYS;
    }

    /** Active rework reason codes from MDMS AMC.RejectionReasons (LLD §6.8); OTHERS is always allowed by the caller. */
    public Set<String> rejectionReasonCodes(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC", "masterDetails", List.of(Map.of("name", "RejectionReasons")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return parseRejectionReasonCodes(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    static Set<String> parseRejectionReasonCodes(JsonNode root) {
        Set<String> out = new TreeSet<>();
        JsonNode list = root == null ? null : root.path("MdmsRes").path("AMC").path("RejectionReasons");
        if (list != null && list.isArray()) {
            for (JsonNode n : list) {
                if (n.path("active").asBoolean(true) && n.path("isActive").asBoolean(true) && n.hasNonNull("code")) {
                    out.add(n.get("code").asText());
                }
            }
        }
        return out;
    }

    /** Active auto-approval rules from MDMS AMC.AutoApprovalRules (LLD §8.2). */
    public List<AutoApproval.Rule> autoApprovalRules(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC", "masterDetails", List.of(Map.of("name", "AutoApprovalRules")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return AutoApproval.parse(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    /** Day counts of MDMS AMC.Config used at read time (LLD §6.8). */
    public record ConfigDays(int reviewSlaDays, int submissionWindowDays) {
    }

    public static final int DEFAULT_REVIEW_SLA_DAYS = 7;

    public ConfigDays configDays(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC", "masterDetails", List.of(Map.of("name", "Config")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return parseConfigDays(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    static ConfigDays parseConfigDays(JsonNode root) {
        JsonNode list = root == null ? null : root.path("MdmsRes").path("AMC").path("Config");
        JsonNode c = list != null && list.isArray() && !list.isEmpty() ? list.get(0) : null;
        int sla = c != null && c.path("reviewSlaDays").canConvertToInt() && c.path("reviewSlaDays").asInt() >= 0
                ? c.path("reviewSlaDays").asInt() : DEFAULT_REVIEW_SLA_DAYS;
        return new ConfigDays(sla, parseSubmissionWindowDays(root));
    }

    /** Program POC emails from MDMS AMC.Config.programPocEmails (LLD §6.7); empty when not configured. */
    public List<String> programPocEmails(String tenantId, RequestInfo requestInfo) {
        Map<String, Object> criteria = new HashMap<>();
        criteria.put("tenantId", tenantId);
        criteria.put("moduleDetails", List.of(Map.of("moduleName", "AMC", "masterDetails", List.of(Map.of("name", "Config")))));
        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);
        body.put("MdmsCriteria", criteria);
        StringBuilder url = new StringBuilder(config.getMdmsHost()).append(config.getMdmsEndPoint());
        return parseProgramPocEmails(mapper.valueToTree(requestRepository.fetchResult(url, body)));
    }

    static List<String> parseProgramPocEmails(JsonNode root) {
        java.util.List<String> out = new java.util.ArrayList<>();
        JsonNode list = root == null ? null : root.path("MdmsRes").path("AMC").path("Config");
        if (list != null && list.isArray() && !list.isEmpty()) {
            list.get(0).path("programPocEmails").forEach(e -> {
                if (e.isTextual() && !e.asText().isBlank()) {
                    out.add(e.asText().trim());
                }
            });
        }
        return out;
    }

    static Options parse(JsonNode root) {
        JsonNode amc = root == null ? null : root.path("MdmsRes").path("AMC");
        return new Options(active(amc == null ? null : amc.path("Frequency"), "months"),
                active(amc == null ? null : amc.path("Duration"), "years"));
    }

    private static Set<Integer> active(JsonNode list, String field) {
        Set<Integer> out = new TreeSet<>();
        if (list != null && list.isArray()) {
            for (JsonNode n : list) {
                if (n.path("active").asBoolean(true) && n.path(field).canConvertToInt()) {
                    out.add(n.path(field).asInt());
                }
            }
        }
        return out;
    }
}
