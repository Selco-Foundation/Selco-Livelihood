package org.selco.e4h.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.selco.e4h.config.LivelihoodSummaryProperties;
import org.selco.e4h.web.models.LivelihoodPocRecipient;
import org.selco.e4h.web.models.LivelihoodSummaryEmailRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.selco.e4h.util.IMConstants.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class LivelihoodPocSummaryEmailService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern(LIVELIHOOD_DATE_PATTERN);

    private final LivelihoodSummaryProperties properties;
    private final LivelihoodPocDirectoryService pocDirectoryService;
    private final LivelihoodSummaryCountService summaryCountService;
    private final LivelihoodSummaryEmailTemplateService summaryEmailTemplateService;
    private final LivelihoodLocalizationClient localizationClient;

    public int runSummaryEmails(LivelihoodSummaryEmailRequest request, boolean weekly) {
        RequestInfo requestInfo = resolveRequestInfo(request);
        String tenantId = resolveTenantId(requestInfo);
        if (!isLivelihoodTenant(tenantId)) {
            log.warn("Skipping summary emails for non-livelihood tenantId={}", tenantId);
            return 0;
        }

        Window window = resolveWindow(request, weekly);
        String appUrl = resolveAppUrl(tenantId, requestInfo);

        List<LivelihoodPocRecipient> pocs = pocDirectoryService.listActivePocs(requestInfo, tenantId);
        if (pocs.isEmpty()) {
            log.warn("No active LIVELIHOOD_POC employees found for tenantId={}", tenantId);
            return 0;
        }
        log.info("Livelihood {} summary: {} POC(s) tenantId={} windowMs=[{}..{}]",
                weekly ? "weekly" : "daily", pocs.size(), tenantId, window.fromMs(), window.toMs());

        int sent = 0;
        for (LivelihoodPocRecipient poc : pocs) {
            List<String> prefixes = pocDirectoryService.toBoundaryPrefixes(poc.getStateBoundaryCodes());
            if (prefixes.isEmpty()) {
                log.warn("Skipping POC {} — no jurisdiction boundaries", poc.getEmail());
                continue;
            }
            log.info("POC {} boundaries={} prefixes={}", poc.getEmail(), poc.getStateBoundaryCodes(), prefixes);

            if (weekly) {
                sendCombinedWeeklySummary(tenantId, poc, window, appUrl, prefixes);
                sent++;
                continue;
            }

            Map<String, String> basePlaceholders = buildBasePlaceholders(poc, window, appUrl);
            for (LivelihoodSummaryEventType eventType : LivelihoodSummaryEventType.values()) {
                String templateCode = eventType.templateCode(false);
                if (templateCode == null) {
                    // Weekly-only metric (e.g. RESOLVED, REASSIGNED_AFTER_ESCALATION) — no daily email for it.
                    continue;
                }
                int count = summaryCountService.count(
                        eventType, tenantId, window.fromMs(), window.toMs(), prefixes);
                if (count <= 0) {
                    log.info("Skip {} for {} count={}", templateCode, poc.getEmail(), count);
                    continue;
                }
                log.info("Send {} to {} count={}", templateCode, poc.getEmail(), count);
                Map<String, String> placeholders = new HashMap<>(basePlaceholders);
                placeholders.put("count", String.valueOf(count));

                summaryEmailTemplateService.sendSummaryEmail(
                        tenantId, requestInfo, poc.getEmail(), templateCode, placeholders);
                sent++;
            }
        }

        log.info("Livelihood {} summary digest completed tenantId={} emailsSent={}",
                weekly ? "weekly" : "daily", tenantId, sent);
        return sent;
    }

    /**
     * Sends one combined weekly ticket-lifecycle digest email to a POC, covering all 8 metrics
     * from the "Expand Weekly Summary Notification" spec (including zero-count ones).
     */
    private void sendCombinedWeeklySummary(String tenantId, LivelihoodPocRecipient poc, Window window,
                                           String appUrl, List<String> prefixes) {
        int newTickets = summaryCountService.count(
                LivelihoodSummaryEventType.NEW_TICKETS, tenantId, window.fromMs(), window.toMs(), prefixes);
        int slaBreaches = summaryCountService.count(
                LivelihoodSummaryEventType.SLA_BREACHES, tenantId, window.fromMs(), window.toMs(), prefixes);
        int outOfScope = summaryCountService.count(
                LivelihoodSummaryEventType.OUT_OF_SCOPE, tenantId, window.fromMs(), window.toMs(), prefixes);
        int reassigned = summaryCountService.count(
                LivelihoodSummaryEventType.REASSIGNED_AFTER_ESCALATION, tenantId, window.fromMs(), window.toMs(), prefixes);
        int quotations = summaryCountService.count(
                LivelihoodSummaryEventType.QUOTATIONS_PENDING, tenantId, window.fromMs(), window.toMs(), prefixes);
        int resolved = summaryCountService.count(
                LivelihoodSummaryEventType.RESOLVED, tenantId, window.fromMs(), window.toMs(), prefixes);
        int closedNoResolution = summaryCountService.count(
                LivelihoodSummaryEventType.CLOSED_WITHOUT_RESOLUTION, tenantId, window.fromMs(), window.toMs(), prefixes);
        int vendorDeclined = summaryCountService.count(
                LivelihoodSummaryEventType.VENDOR_DECLINED, tenantId, window.fromMs(), window.toMs(), prefixes);

        int total = newTickets + slaBreaches + outOfScope + reassigned + quotations
                + resolved + closedNoResolution + vendorDeclined;

        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("APP_NAME", LIVELIHOOD_APP_NAME);
        placeholders.put("POC_NAME", poc.getName());
        placeholders.put("WEEK_START_DATE", window.weekStartLabel());
        placeholders.put("WEEK_DATE_RANGE", window.weekRangeLabel());
        placeholders.put("PLATFORM_LINK", appUrl);
        placeholders.put("TOTAL_EVENT_COUNT", String.valueOf(total));
        placeholders.put("NEW_TICKET_COUNT", String.valueOf(newTickets));
        placeholders.put("SLA_BREACH_COUNT", String.valueOf(slaBreaches));
        placeholders.put("OUT_OF_SCOPE_COUNT", String.valueOf(outOfScope));
        placeholders.put("REASSIGNED_COUNT", String.valueOf(reassigned));
        placeholders.put("QUOTATION_COUNT", String.valueOf(quotations));
        placeholders.put("RESOLVED_COUNT", String.valueOf(resolved));
        placeholders.put("CLOSED_NO_RESOLUTION_COUNT", String.valueOf(closedNoResolution));
        placeholders.put("VENDOR_DECLINED_COUNT", String.valueOf(vendorDeclined));

        log.info("Send combined weekly summary to {} total={}", poc.getEmail(), total);
        summaryEmailTemplateService.sendCombinedWeeklySummaryEmail(tenantId, poc.getEmail(), placeholders);
    }

    private RequestInfo resolveRequestInfo(LivelihoodSummaryEmailRequest request) {
        if (request != null && request.getRequestInfo() != null) {
            return request.getRequestInfo();
        }
        RequestInfo requestInfo = new RequestInfo();
        requestInfo.setApiId("im-services-analytics");
        requestInfo.setVer("1.0");
        requestInfo.setAction("_create");
        requestInfo.setMsgId("livelihood-summary-cron");
        return requestInfo;
    }

    private Map<String, String> buildBasePlaceholders(LivelihoodPocRecipient poc, Window window, String appUrl) {
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("app_name", LIVELIHOOD_APP_NAME);
        placeholders.put("poc_name", poc.getName());
        placeholders.put("date", window.dateLabel());
        placeholders.put("week_start", window.weekStartLabel());
        placeholders.put("week_range", window.weekRangeLabel());
        placeholders.put("url", appUrl);
        return placeholders;
    }

    private String resolveAppUrl(String tenantId, RequestInfo requestInfo) {
        String url = localizationClient.resolveMessage(tenantId, requestInfo, LIVELIHOOD_URL_SMS_MESSAGE);
        if (StringUtils.hasText(url)) {
            return url;
        }
        if (StringUtils.hasText(properties.getMobileAppLink())) {
            return properties.getMobileAppLink();
        }
        return "";
    }

    private String resolveTenantId(RequestInfo requestInfo) {
        if (requestInfo.getUserInfo() != null && StringUtils.hasText(requestInfo.getUserInfo().getTenantId())) {
            return requestInfo.getUserInfo().getTenantId();
        }
        return properties.getLivelihoodTenantId();
    }

    private boolean isLivelihoodTenant(String tenantId) {
        if (!StringUtils.hasText(tenantId)) {
            return false;
        }
        String livelihoodTenant = properties.getLivelihoodTenantId();
        return tenantId.equalsIgnoreCase(livelihoodTenant)
                || tenantId.toLowerCase().startsWith(livelihoodTenant.toLowerCase() + ".");
    }

    private Window resolveWindow(LivelihoodSummaryEmailRequest request, boolean weekly) {
        Long fromDate = request != null ? request.getFromDate() : null;
        Long toDate = request != null ? request.getToDate() : null;
        if (fromDate != null && toDate != null) {
            LocalDate start = Instant.ofEpochMilli(fromDate).atZone(IST).toLocalDate();
            LocalDate end = Instant.ofEpochMilli(toDate).atZone(IST).toLocalDate();
            return new Window(fromDate, toDate, start, end);
        }
        LocalDate today = LocalDate.now(IST);
        if (weekly) {
            // Cron runs Monday 09:00 IST for the previous completed Mon–Sun week.
            LocalDate thisMonday = today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            LocalDate weekStart = thisMonday.minusWeeks(1);
            LocalDate weekEnd = weekStart.plusDays(6);
            long from = weekStart.atStartOfDay(IST).toInstant().toEpochMilli();
            long to = weekEnd.plusDays(1).atStartOfDay(IST).toInstant().toEpochMilli() - 1;
            return new Window(from, to, weekStart, weekEnd);
        }
        long from = today.atStartOfDay(IST).toInstant().toEpochMilli();
        long to = today.plusDays(1).atStartOfDay(IST).toInstant().toEpochMilli() - 1;
        return new Window(from, to, today, today);
    }

    private record Window(long fromMs, long toMs, LocalDate periodStart, LocalDate periodEnd) {
        String dateLabel() {
            return periodEnd.format(DATE_FMT);
        }

        String weekStartLabel() {
            return periodStart.format(DATE_FMT);
        }

        String weekRangeLabel() {
            return periodStart.format(DATE_FMT) + " to " + periodEnd.format(DATE_FMT);
        }
    }
}
