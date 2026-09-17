package org.selco.e4h.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.selco.e4h.config.ConsumerConfiguration;
import org.selco.e4h.config.LivelihoodSummaryProperties;
import org.selco.e4h.repository.ServiceRequestRepository;
import org.selco.e4h.util.LivelihoodBoundaryScopeUtil;
import org.selco.e4h.web.models.LivelihoodPocRecipient;
import org.selco.e4h.web.models.RequestInfoWrapper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.selco.e4h.util.IMConstants.ROLE_LIVELIHOOD_POC;

@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodPocDirectoryService {

    private final ServiceRequestRepository repository;
    private final ConsumerConfiguration consumerConfiguration;
    private final ObjectMapper objectMapper;

    public List<LivelihoodPocRecipient> listActivePocs(RequestInfo requestInfo, String tenantId) {
        StringBuilder url = buildHrmsUrl(tenantId);
        url.append("&limit=200&offset=0");
        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = repository.fetchResult(url, wrapper);
        if (response == null) {
            return List.of();
        }

        try {
            JsonNode employees = objectMapper.valueToTree(response).path("Employees");
            if (!employees.isArray() || employees.isEmpty()) {
                return List.of();
            }
            List<LivelihoodPocRecipient> recipients = new ArrayList<>();
            for (JsonNode employee : employees) {
                LivelihoodPocRecipient recipient = toRecipient(employee);
                if (recipient != null) {
                    recipients.add(recipient);
                }
            }
            return recipients;
        } catch (Exception e) {
            log.error("Failed to list livelihood POC employees for tenantId={}", tenantId, e);
            return List.of();
        }
    }

    public List<String> toBoundaryPrefixes(List<String> stateBoundaryCodes) {
        return LivelihoodBoundaryScopeUtil.toBoundaryPrefixes(stateBoundaryCodes);
    }

    private StringBuilder buildHrmsUrl(String tenantId) {
        StringBuilder builder = new StringBuilder(consumerConfiguration.getHrmsHost());
        builder.append(consumerConfiguration.getHrmsSearchUrl());
        builder.append("?tenantId=").append(tenantId);
        builder.append("&roles=").append(ROLE_LIVELIHOOD_POC);
        builder.append("&searchOnlyInBoundary=true");
        builder.append("&isActive=true");
        return builder;
    }

    private LivelihoodPocRecipient toRecipient(JsonNode employee) {
        if (employee == null || employee.isMissingNode()) {
            return null;
        }
        JsonNode user = employee.path("user");
        if (user.isMissingNode()) {
            return null;
        }
        String email = textValue(user, "emailId");
        if (!StringUtils.hasText(email)) {
            return null;
        }
        String name = textValue(user, "name");
        if (!StringUtils.hasText(name)) {
            name = "Program POC";
        }

        Set<String> boundaries = new LinkedHashSet<>();
        JsonNode jurisdictions = employee.path("jurisdictions");
        if (jurisdictions.isArray()) {
            for (JsonNode jurisdiction : jurisdictions) {
                if (jurisdiction.path("isActive").asBoolean(true)) {
                    String boundary = textValue(jurisdiction, "boundary");
                    if (StringUtils.hasText(boundary)) {
                        boundaries.add(boundary.trim());
                    }
                }
            }
        }
        if (boundaries.isEmpty()) {
            return null;
        }

        return LivelihoodPocRecipient.builder()
                .uuid(textValue(user, "uuid"))
                .name(name)
                .email(email)
                .stateBoundaryCodes(new ArrayList<>(boundaries))
                .build();
    }

    private static String textValue(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text.isBlank() ? null : text;
    }
}
