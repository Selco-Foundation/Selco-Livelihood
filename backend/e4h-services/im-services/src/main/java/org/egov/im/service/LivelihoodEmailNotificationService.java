package org.egov.im.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.im.config.IMConfiguration;
import org.egov.im.producer.Producer;
import org.egov.im.util.LivelihoodEmailTemplateLoader;
import org.egov.im.web.models.IncidentRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

/**
 * Livelihood POC and vendor email notifications. Both subject and body come from a single source
 * file, {@code classpath:templates/livelihood/{templateCode}.html} — the {@code <title>} holds the
 * subject, the rest is the body — loaded via {@link LivelihoodEmailTemplateLoader}
 * (LIV-TPL-005/006/010/013/015/019). Not localized: these are HTML and too large/structured for
 * {@code egov-localization}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodEmailNotificationService {

    private final IMConfiguration config;
    private final LivelihoodSmsNotificationService livelihoodSmsNotificationService;
    private final LivelihoodEmailTemplateLoader templateLoader;
    private final Producer producer;

    public void sendEmail(IncidentRequest request, String emailId, String templateCode) {
        sendEmail(request, emailId, templateCode, Map.of());
    }

    public void sendEmail(IncidentRequest request, String emailId, String templateCode,
                          Map<String, String> extraPlaceholders) {
        if (request == null || request.getIncident() == null || StringUtils.isBlank(emailId)) {
            return;
        }
        String subject = buildSubject(request, templateCode, extraPlaceholders);
        String body = buildBody(request, templateCode, extraPlaceholders);
        if (StringUtils.isBlank(subject) || StringUtils.isBlank(body)) {
            log.warn("Empty email for template {} incidentId={}", templateCode,
                    request.getIncident().getIncidentId());
            return;
        }
        publishEmail(emailId, subject, body, request.getIncident().getTenantId());
        log.info("Livelihood email sent template={} incidentId={} to={}",
                templateCode, request.getIncident().getIncidentId(), emailId);
    }

    public String buildSubject(IncidentRequest request, String templateCode, Map<String, String> extraPlaceholders) {
        String template = templateLoader.getSubject(templateCode);
        if (StringUtils.isBlank(template)) {
            log.warn("No Livelihood email subject found for code {}", templateCode);
            return null;
        }
        return applyPlaceholders(template, mergePlaceholders(request, extraPlaceholders));
    }

    public String buildBody(IncidentRequest request, String templateCode, Map<String, String> extraPlaceholders) {
        String template = templateLoader.getBody(templateCode);
        if (StringUtils.isBlank(template)) {
            log.warn("No Livelihood email body found for code {}", templateCode);
            return null;
        }
        return applyPlaceholders(template, mergePlaceholders(request, extraPlaceholders));
    }

    private Map<String, String> mergePlaceholders(IncidentRequest request, Map<String, String> extraPlaceholders) {
        Map<String, String> placeholders = new HashMap<>(livelihoodSmsNotificationService.buildPlaceholders(request));
        if (extraPlaceholders != null) {
            placeholders.putAll(extraPlaceholders);
        }
        return placeholders;
    }

    private void publishEmail(String emailId, String subject, String body, String tenantId) {
        Map<String, Object> email = new HashMap<>();
        email.put("emailTo", new HashSet<>(Collections.singletonList(emailId)));
        email.put("subject", subject);
        email.put("body", body);
        email.put("tenantId", tenantId);

        Map<String, Object> emailRequest = new HashMap<>();
        emailRequest.put("requestInfo", new HashMap<>());
        emailRequest.put("email", email);

        producer.push(tenantId, config.getNotificationEmailTopic(), emailRequest);
    }

    private String applyPlaceholders(String template, Map<String, String> placeholders) {
        String message = template;
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            message = message.replace("{" + entry.getKey() + "}", nullToEmpty(entry.getValue()));
        }
        return message;
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
