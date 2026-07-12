package org.egov.im.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.im.config.IMConfiguration;
import org.egov.im.producer.Producer;
import org.egov.im.util.NotificationUtil;
import org.egov.im.web.models.IncidentRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

import static org.egov.im.util.IMConstants.*;

/**
 * Livelihood POC email notifications via {@code egov-localization} ({@code rainmaker-livelihood})
 * with inline fallbacks matching Setu 4 Livelihood template copy (LIV-TPL-005/006/010/013/015/018).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodEmailNotificationService {

    private static final Map<String, String> DEFAULT_BODIES = Map.ofEntries(
            Map.entry(LIV_TPL_005,
                    "SLA has been breached for livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date}. "
                            + "Please review and take necessary action or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_006,
                    "Livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date} has been marked as Out of Scope. "
                            + "Reason: {out_of_scope_reason}. Please review and take necessary action or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_010,
                    "A quotation has been submitted for your livelihood support ticket for {ticket_type} with ID {incidentId}, "
                            + "raised on {date}. Please review the quotation document by clicking {quotation_link}. - SELCO Foundation"),
            Map.entry(LIV_TPL_013,
                    "Livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date} has been closed without resolution. "
                            + "Reason: {reason}. Please review or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_015,
                    "Livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date} has been declined by the vendor. "
                            + "Reason: {reason}. Please review and take necessary action or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_018,
                    "A new livelihood ticket has been registered under ID {incidentId} on {date} for end user {end_user_name}. "
                            + "Please review or track details on {url} - SELCO Foundation")
    );

    private static final Map<String, String> DEFAULT_SUBJECTS = Map.ofEntries(
            Map.entry(LIV_TPL_005, "SLA breached: {incidentId}"),
            Map.entry(LIV_TPL_006, "Out of scope – action required: {incidentId}"),
            Map.entry(LIV_TPL_010, "Out of warranty quotation uploaded: {incidentId}"),
            Map.entry(LIV_TPL_013, "Ticket closed without resolution: {incidentId}"),
            Map.entry(LIV_TPL_015, "Ticket closed after decline: {incidentId}"),
            Map.entry(LIV_TPL_018, "New Livelihood ticket: {incidentId}")
    );

    private final IMConfiguration config;
    private final NotificationUtil notificationUtil;
    private final LivelihoodSmsNotificationService livelihoodSmsNotificationService;
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
        String template = resolveTemplate(request, subjectCode(templateCode), DEFAULT_SUBJECTS.get(templateCode));
        if (StringUtils.isBlank(template)) {
            return null;
        }
        return applyPlaceholders(template, mergePlaceholders(request, extraPlaceholders));
    }

    public String buildBody(IncidentRequest request, String templateCode, Map<String, String> extraPlaceholders) {
        String template = resolveTemplate(request, templateCode, DEFAULT_BODIES.get(templateCode));
        if (StringUtils.isBlank(template)) {
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

    private String resolveTemplate(IncidentRequest request, String templateCode, String fallback) {
        String localizationMessage = notificationUtil.getLocalizationMessages(
                request.getIncident().getTenantId(),
                request.getRequestInfo(),
                config.getLivelihoodLocalizationModule()
        );
        String template = notificationUtil.getCustomizedMsgForPlaceholder(localizationMessage, templateCode);
        if (StringUtils.isNotBlank(template)) {
            return template;
        }
        if (StringUtils.isBlank(fallback)) {
            log.warn("No Livelihood email template found for code {}", templateCode);
        }
        return fallback;
    }

    private static String subjectCode(String templateCode) {
        return templateCode + LIVELIHOOD_EMAIL_SUBJECT_SUFFIX;
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
