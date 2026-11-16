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
