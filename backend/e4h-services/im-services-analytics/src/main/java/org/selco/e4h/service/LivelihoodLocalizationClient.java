package org.selco.e4h.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.selco.e4h.config.LivelihoodSummaryProperties;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LivelihoodLocalizationClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final LivelihoodSummaryProperties properties;

    public String resolveMessage(String tenantId, RequestInfo requestInfo, String code) {
        if (!StringUtils.hasText(code)) {
            return null;
        }
        Map<String, String> messages = fetchMessages(tenantId, requestInfo, code);
        return messages.get(code);
    }

    private Map<String, String> fetchMessages(String tenantId, RequestInfo requestInfo, String code) {
        String url = UriComponentsBuilder
                .fromHttpUrl(buildSearchUrl())
                .queryParam("tenantId", tenantId)
                .queryParam("module", properties.getLocalizationModule())
                .queryParam("locale", properties.getLocalizationLocale())
                .queryParam("codes", code)
                .build()
                .toUriString();

        Map<String, Object> body = new HashMap<>();
        if (requestInfo != null) {
            body.put("RequestInfo", requestInfo);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                return Map.of();
            }
            return parseMessages(response.getBody());
        } catch (Exception e) {
            log.debug("Livelihood localization request failed tenantId={} code={}: {}",
                    tenantId, code, e.getMessage());
            return Map.of();
        }
    }

    private String buildSearchUrl() {
        String host = properties.getLocalizationHost() == null
                ? ""
                : properties.getLocalizationHost().replaceAll("/+$", "");
        String context = properties.getLocalizationContextPath();
        String endpoint = properties.getLocalizationSearchEndpoint();
        if (host.contains("/localization/messages")) {
            return host + endpoint;
        }
        return host + context + endpoint;
    }

    private Map<String, String> parseMessages(String responseBody) {
        Map<String, String> result = new HashMap<>();
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode messages = root.path("messages");
            if (!messages.isArray()) {
                return result;
            }
            for (JsonNode message : messages) {
                String code = message.path("code").asText(null);
                String text = message.path("message").asText(null);
                if (code != null && !code.isBlank() && text != null && !text.isBlank()) {
                    result.put(code, text);
                }
            }
        } catch (Exception e) {
            log.debug("Failed to parse localization response: {}", e.getMessage());
        }
        return result;
    }
}
