package org.selco.e4h.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.selco.e4h.config.ConsumerConfiguration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

import static org.selco.e4h.util.IMConstants.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodSummaryEmailTemplateService {

    private static final Map<String, String> DEFAULT_SUBJECTS = buildDefaultSubjects();
    private static final Map<String, String> DEFAULT_BODIES = buildDefaultBodies();

    private final LivelihoodLocalizationClient localizationClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ConsumerConfiguration consumerConfiguration;

    public void sendSummaryEmail(String tenantId,
                                 RequestInfo requestInfo,
                                 String emailId,
                                 String templateCode,
                                 Map<String, String> placeholders) {
        if (!StringUtils.hasText(emailId) || !StringUtils.hasText(templateCode)) {
            return;
        }
        String subject = buildSubject(tenantId, requestInfo, templateCode, placeholders);
        String body = buildBody(tenantId, requestInfo, templateCode, placeholders);
        if (!StringUtils.hasText(subject) || !StringUtils.hasText(body)) {
            log.warn("Empty summary email for template {}", templateCode);
            return;
        }
        publishEmail(emailId, subject, body, tenantId);
        log.info("Livelihood summary email sent template={} to={}", templateCode, emailId);
    }

    public String buildSubject(String tenantId,
                               RequestInfo requestInfo,
                               String templateCode,
                               Map<String, String> placeholders) {
        String template = resolveTemplate(tenantId, requestInfo, subjectCode(templateCode),
                DEFAULT_SUBJECTS.get(templateCode));
        return applyPlaceholders(template, placeholders);
    }

    public String buildBody(String tenantId,
                          RequestInfo requestInfo,
                          String templateCode,
                          Map<String, String> placeholders) {
        String template = resolveTemplate(tenantId, requestInfo, templateCode, DEFAULT_BODIES.get(templateCode));
        return applyPlaceholders(template, placeholders);
    }

    private String resolveTemplate(String tenantId,
                                   RequestInfo requestInfo,
                                   String templateCode,
                                   String fallback) {
        String template = localizationClient.resolveMessage(tenantId, requestInfo, templateCode);
        if (StringUtils.hasText(template)) {
            return template;
        }
        if (!StringUtils.hasText(fallback)) {
            log.warn("No Livelihood summary template found for code {}", templateCode);
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

        kafkaTemplate.send(consumerConfiguration.getNotificationEmailTopic(), emailRequest);
    }

    private String applyPlaceholders(String template, Map<String, String> placeholders) {
        if (!StringUtils.hasText(template)) {
            return null;
        }
        String message = template;
        if (placeholders != null) {
            for (Map.Entry<String, String> entry : placeholders.entrySet()) {
                message = message.replace("{" + entry.getKey() + "}", nullToEmpty(entry.getValue()));
            }
        }
        return message;
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private static Map<String, String> buildDefaultSubjects() {
        Map<String, String> subjects = new HashMap<>();
        subjects.put(LIV_SUM_D_001, "[{app_name}] Daily Summary – {count} New Ticket(s) Raised – {date}");
        subjects.put(LIV_SUM_D_002, "[{app_name}] Daily Summary – {count} SLA Breach(es) – {date}");
        subjects.put(LIV_SUM_D_003, "[{app_name}] Daily Summary – {count} Ticket(s) Marked Out of Scope – {date}");
        subjects.put(LIV_SUM_D_004, "[{app_name}] Daily Summary – {count} Quotation(s) Pending Review – {date}");
        subjects.put(LIV_SUM_D_005, "[{app_name}] Daily Summary – {count} Ticket(s) Closed Without Resolution – {date}");
        subjects.put(LIV_SUM_D_006, "[{app_name}] Daily Summary – {count} Ticket(s) Declined by Vendor – {date}");
        subjects.put(LIV_SUM_D_007, "[{app_name}] Daily Summary – {count} New Livelihood Activity(ies) Registered – {date}");
        subjects.put(LIV_SUM_D_008, "[{app_name}] Daily Summary – {count} Support Request(s) Approved – {date}");
        subjects.put(LIV_SUM_D_009, "[{app_name}] Daily Summary – {count} Support Request(s) Rejected – {date}");
        subjects.put(LIV_SUM_D_010, "[{app_name}] Daily Summary – {count} Field Visit(s) Assigned – {date}");
        subjects.put(LIV_SUM_D_011, "[{app_name}] Daily Summary – {count} Ticket(s) Nearing SLA – {date}");
        subjects.put(LIV_SUM_D_012, "[{app_name}] Daily Summary – {count} Equipment Report(s) Submitted – {date}");

        subjects.put(LIV_SUM_W_001, "[{app_name}] Weekly Summary – {count} New Ticket(s) Raised – Week of {week_start}");
        subjects.put(LIV_SUM_W_002, "[{app_name}] Weekly Summary – {count} SLA Breach(es) – Week of {week_start}");
        subjects.put(LIV_SUM_W_003, "[{app_name}] Weekly Summary – {count} Ticket(s) Marked Out of Scope – Week of {week_start}");
        subjects.put(LIV_SUM_W_004, "[{app_name}] Weekly Summary – {count} Quotation(s) Pending Review – Week of {week_start}");
        subjects.put(LIV_SUM_W_005, "[{app_name}] Weekly Summary – {count} Ticket(s) Closed Without Resolution – Week of {week_start}");
        subjects.put(LIV_SUM_W_006, "[{app_name}] Weekly Summary – {count} Ticket(s) Declined by Vendor – Week of {week_start}");
        subjects.put(LIV_SUM_W_007, "[{app_name}] Weekly Summary – {count} New Livelihood Activity(ies) Registered – Week of {week_start}");
        subjects.put(LIV_SUM_W_008, "[{app_name}] Weekly Summary – {count} Support Request(s) Approved – Week of {week_start}");
        subjects.put(LIV_SUM_W_009, "[{app_name}] Weekly Summary – {count} Support Request(s) Rejected – Week of {week_start}");
        subjects.put(LIV_SUM_W_010, "[{app_name}] Weekly Summary – {count} Field Visit(s) Assigned – Week of {week_start}");
        subjects.put(LIV_SUM_W_011, "[{app_name}] Weekly Summary – {count} Ticket(s) Nearing SLA – Week of {week_start}");
        subjects.put(LIV_SUM_W_012, "[{app_name}] Weekly Summary – {count} Equipment Report(s) Submitted – Week of {week_start}");
        return subjects;
    }

    private static Map<String, String> buildDefaultBodies() {
        Map<String, String> bodies = new HashMap<>();
        bodies.put(LIV_SUM_D_001, dailyBody("New tickets raised", "New tickets raised today", "View all new tickets"));
        bodies.put(LIV_SUM_D_002, dailyBody("SLA breaches", "SLA breaches today", "View all SLA breached tickets"));
        bodies.put(LIV_SUM_D_003, dailyBody("Tickets marked out of scope", "Tickets marked out of scope today", "View all out of scope tickets"));
        bodies.put(LIV_SUM_D_004, dailyBody("Quotations submitted and pending review", "Quotations submitted and pending review today", "Review all pending quotations"));
        bodies.put(LIV_SUM_D_005, dailyBody("Tickets closed without resolution", "Tickets closed without resolution today", "View all tickets closed without resolution"));
        bodies.put(LIV_SUM_D_006, dailyBody("Tickets declined by vendor", "Tickets declined by vendor today", "View all vendor-declined tickets"));
        bodies.put(LIV_SUM_D_007, dailyBody("New livelihood activities registered", "New livelihood activities registered today", "View all registered activities"));
        bodies.put(LIV_SUM_D_008, dailyBody("Livelihood support requests approved", "Livelihood support requests approved today", "View all approved requests"));
        bodies.put(LIV_SUM_D_009, dailyBody("Livelihood support requests rejected", "Livelihood support requests rejected today", "View all rejected requests"));
        bodies.put(LIV_SUM_D_010, dailyBody("Field visits assigned", "Field visits assigned today", "View all assigned field visits"));
        bodies.put(LIV_SUM_D_011, dailyBody("Tickets nearing SLA deadline", "Tickets nearing SLA deadline today", "View all tickets nearing SLA"));
        bodies.put(LIV_SUM_D_012, dailyBody("Equipment reports submitted", "Equipment reports submitted today", "View all submitted reports"));

        bodies.put(LIV_SUM_W_001, weeklyBody("New tickets raised", "New tickets raised this week", "View all new tickets"));
        bodies.put(LIV_SUM_W_002, weeklyBody("SLA breaches", "SLA breaches this week", "View all SLA breached tickets"));
        bodies.put(LIV_SUM_W_003, weeklyBody("Tickets marked out of scope", "Tickets marked out of scope this week", "View all out of scope tickets"));
        bodies.put(LIV_SUM_W_004, weeklyBody("Quotations submitted and pending review", "Quotations submitted and pending review this week", "Review all pending quotations"));
        bodies.put(LIV_SUM_W_005, weeklyBody("Tickets closed without resolution", "Tickets closed without resolution this week", "View all tickets closed without resolution"));
        bodies.put(LIV_SUM_W_006, weeklyBody("Tickets declined by vendor", "Tickets declined by vendor this week", "View all vendor-declined tickets"));
        bodies.put(LIV_SUM_W_007, weeklyBody("New livelihood activities registered", "New livelihood activities registered this week", "View all registered activities"));
        bodies.put(LIV_SUM_W_008, weeklyBody("Livelihood support requests approved", "Livelihood support requests approved this week", "View all approved requests"));
        bodies.put(LIV_SUM_W_009, weeklyBody("Livelihood support requests rejected", "Livelihood support requests rejected this week", "View all rejected requests"));
        bodies.put(LIV_SUM_W_010, weeklyBody("Field visits assigned", "Field visits assigned this week", "View all assigned field visits"));
        bodies.put(LIV_SUM_W_011, weeklyBody("Tickets nearing SLA deadline", "Tickets nearing SLA deadline this week", "View all tickets nearing SLA"));
        bodies.put(LIV_SUM_W_012, weeklyBody("Equipment reports submitted", "Equipment reports submitted this week", "View all submitted reports"));
        return bodies;
    }

    private static String dailyBody(String summaryLabel, String metricLine, String ctaLine) {
        return "Dear {poc_name},\n\n"
                + "Here is your daily summary for " + summaryLabel + ".\n\n"
                + metricLine + ": {count}\n"
                + "Date: {date}\n\n"
                + "Click below to view the full details:\n"
                + ctaLine + ": {url}\n"
                + "- SELCO Foundation";
    }

    private static String weeklyBody(String summaryLabel, String metricLine, String ctaLine) {
        return "Dear {poc_name},\n\n"
                + "Here is your weekly summary for " + summaryLabel + ".\n\n"
                + metricLine + ": {count}\n"
                + "Week: {week_range}\n\n"
                + "Click below to view the full details:\n"
                + ctaLine + ": {url}\n"
                + "- SELCO Foundation";
    }
}
