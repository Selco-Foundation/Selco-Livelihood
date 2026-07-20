package org.egov.im.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.im.config.IMConfiguration;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.util.NotificationUtil;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Notification.SMSRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.egov.im.util.IMConstants.*;

/**
 * Livelihood SMS notifications via {@code egov-localization} ({@code rainmaker-livelihood} module)
 * with inline fallbacks matching Setu 4 Livelihood template copy (LIV-TPL-*).
 * Pattern aligned with {@link WorkflowSmsNotificationService} and E4H {@link NotificationService}.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodSmsNotificationService {

    private static final Map<String, String> DEFAULT_TEMPLATES = Map.ofEntries(
            Map.entry(LIV_TPL_001,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} has been raised on {date} "
                            + "and is being reviewed. Track your ticket on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_002,
                    "A livelihood support ticket for {ticket_type} with ID {incidentId} has been raised on your behalf "
                            + "on {date}. Track your ticket on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_003,
                    "A livelihood support ticket for {ticket_type} with ID {incidentId} has been raised on {date} "
                            + "on behalf of end user {end_user_name}. Please take necessary action or track ticket "
                            + "details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_004,
                    "SLA breached for livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date}. "
                            + "Immediate action is required. Please resolve or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_007,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} submitted on {date} "
                            + "has been escalated and reassigned for resolution. Track your ticket on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_008,
                    "Livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date} has been reassigned "
                            + "to you after escalation. Please take necessary action or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_009,
                    "A quotation has been submitted for your livelihood support ticket for {ticket_type} with ID {incidentId} "
                            + "submitted on {date}. Please review and click to view the quotation document using this link: "
                            + "{quotation_link}. - SELCO Foundation"),
            Map.entry(LIV_TPL_011,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} submitted on {date} has been resolved. "
                            + "We hope your issue has been addressed. Not satisfied with the resolution? You can change ticket "
                            + "status on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_012,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} submitted on {date} has been closed. "
                            + "For further assistance, please contact the SELCO team or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_014,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} submitted on {date} has been declined "
                            + "by the vendor. Please contact your Program POC for further assistance or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_016,
                    "Your livelihood support ticket for {ticket_type} with ID {incidentId} submitted on {date} has been declined "
                            + "by the SELCO Foundation. For further assistance, please reach out to your local coordinator or track ticket "
                            + "details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_032,
                    "A follow-up action is required for your livelihood support ticket for {ticket_type} with ID {incidentId}. "
                            + "Reason: {reason}. Please respond at the earliest or track ticket details on {url} - SELCO Foundation"),
            Map.entry(LIV_TPL_033,
                    "A follow-up action is required for livelihood ticket for {ticket_type} with ID {incidentId} submitted on {date}. "
                            + "Reason: {reason}. Please take necessary action or track ticket details on {url} - SELCO Foundation")
    );

    private final IMConfiguration config;
    private final NotificationUtil notificationUtil;
    private final LivelihoodIssueTypeUtil livelihoodIssueTypeUtil;

    public void sendSms(IncidentRequest request, String mobileNumber, String templateCode) {
        sendSms(request, mobileNumber, templateCode, Map.of());
    }

    public void sendSms(IncidentRequest request, String mobileNumber, String templateCode,
                        Map<String, String> extraPlaceholders) {
        if (config.getIsSMSEnabled() == null || !config.getIsSMSEnabled()) {
            return;
        }
        if (request == null || request.getIncident() == null || StringUtils.isBlank(mobileNumber)) {
            return;
        }
        String message = buildMessage(request, templateCode, extraPlaceholders);
        if (StringUtils.isBlank(message)) {
            log.warn("Empty SMS message for template {} incidentId={}", templateCode,
                    request.getIncident().getIncidentId());
            return;
        }
        notificationUtil.sendSMS(
                request.getIncident().getTenantId(),
                Collections.singletonList(SMSRequest.builder().mobileNumber(mobileNumber).message(message).build())
        );
        log.info("Livelihood SMS sent template={} incidentId={}", templateCode, request.getIncident().getIncidentId());
    }

    public String buildMessage(IncidentRequest request, String templateCode, Map<String, String> extraPlaceholders) {
        String template = resolveTemplate(request, templateCode);
        if (StringUtils.isBlank(template)) {
            return null;
        }
        Map<String, String> placeholders = buildPlaceholders(request);
        if (extraPlaceholders != null) {
            placeholders.putAll(extraPlaceholders);
        }
        return applyPlaceholders(template, placeholders);
    }

    private String resolveTemplate(IncidentRequest request, String templateCode) {
        String localizationMessage = notificationUtil.getLocalizationMessages(
                request.getIncident().getTenantId(),
                request.getRequestInfo(),
                config.getLivelihoodLocalizationModule()
        );
        String template = notificationUtil.getCustomizedMsgForPlaceholder(localizationMessage, templateCode);
        if (StringUtils.isNotBlank(template)) {
            return template;
        }
        template = DEFAULT_TEMPLATES.get(templateCode);
        if (StringUtils.isBlank(template)) {
            log.warn("No Livelihood SMS template found for code {}", templateCode);
        }
        return template;
    }

    public Map<String, String> buildPlaceholders(IncidentRequest request) {
        Incident incident = request.getIncident();
        String assetType = resolveAssetType(incident);
        Map<String, String> placeholders = new HashMap<>();
        // Word doc "Equipment / Issue Type" → use asset/machine category, not issue code.
        placeholders.put("ticket_type", assetType);
        placeholders.put("equipment_type", assetType);
        placeholders.put("asset_type", assetType);
        placeholders.put("incidentId", nullToEmpty(incident.getIncidentId()));
        placeholders.put("ticket_id", nullToEmpty(incident.getIncidentId()));
        placeholders.put("date", formatRaisedDate(incident));
        placeholders.put("raised_date", formatRaisedDate(incident));
        placeholders.put("url", resolveAppUrl(request));
        placeholders.put("end_user_name", resolveEndUserName(incident));
        placeholders.put("reason", resolveReason(request));
        placeholders.put("out_of_scope_reason", resolveOutOfScopeReason(request));
        placeholders.put("quotation_link", resolveQuotationLink(request));
        return placeholders;
    }

    private String resolveAssetType(Incident incident) {
        String assetCategory = livelihoodIssueTypeUtil.extractAssetCategory(incident);
        if (StringUtils.isNotBlank(assetCategory)) {
            return assetCategory.trim();
        }
        return nullToEmpty(incident.getIncidentType());
    }

    private String resolveAppUrl(IncidentRequest request) {
        String localizationMessage = notificationUtil.getLocalizationMessages(
                request.getIncident().getTenantId(),
                request.getRequestInfo(),
                config.getLivelihoodLocalizationModule()
        );
        String url = notificationUtil.getCustomizedMsgForPlaceholder(localizationMessage, LIVELIHOOD_URL_SMS_MESSAGE);
        if (StringUtils.isNotBlank(url)) {
            return url;
        }
        if (StringUtils.isNotBlank(config.getLivelihoodMobileAppLink())) {
            return config.getLivelihoodMobileAppLink();
        }
        return config.getMobileDownloadLink();
    }

    private String formatRaisedDate(Incident incident) {
        if (incident.getAuditDetails() == null || incident.getAuditDetails().getCreatedTime() == null) {
            return "";
        }
        Long createdTime = incident.getAuditDetails().getCreatedTime();
        LocalDate date = Instant.ofEpochMilli(createdTime > 10 ? createdTime : createdTime * 1000)
                .atZone(ZoneId.systemDefault())
                .toLocalDate();
        return date.format(DateTimeFormatter.ofPattern(LIVELIHOOD_DATE_PATTERN));
    }

    private String resolveEndUserName(Incident incident) {
        if (incident.getReporter() != null && StringUtils.isNotBlank(incident.getReporter().getName())) {
            return incident.getReporter().getName();
        }
        return "End User";
    }

    private String resolveReason(IncidentRequest request) {
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getComments())) {
            return request.getWorkflow().getComments();
        }
        return resolveOutOfScopeReason(request);
    }

    private String resolveOutOfScopeReason(IncidentRequest request) {
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getOutOfScopeReason())) {
            return request.getWorkflow().getOutOfScopeReason();
        }
        if (request.getWorkflow() != null && StringUtils.isNotBlank(request.getWorkflow().getComments())) {
            return request.getWorkflow().getComments();
        }
        return "Not specified";
    }

    public String resolveQuotationLink(IncidentRequest request) {
        if (request.getWorkflow() == null || CollectionUtils.isEmpty(request.getWorkflow().getVerificationDocuments())) {
            return resolveAppUrl(request);
        }
        return request.getWorkflow().getVerificationDocuments().stream()
                .filter(doc -> doc != null && StringUtils.isNotBlank(doc.getFileStoreId()))
                .map(doc -> buildFileStoreUrl(request.getIncident().getTenantId(), doc.getFileStoreId()))
                .findFirst()
                .orElse(resolveAppUrl(request));
    }

    private String buildFileStoreUrl(String tenantId, String fileStoreId) {
        return String.format("%s?tenantId=%s&fileStoreId=%s",
                config.getFileStoreDownloadEndpoint(),
                tenantId,
                fileStoreId);
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
