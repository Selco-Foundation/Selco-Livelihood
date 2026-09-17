package org.selco.e4h.web.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.selco.e4h.service.LivelihoodPocSummaryEmailService;
import org.selco.e4h.web.models.LivelihoodSummaryEmailRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Livelihood POC digest emails (daily / weekly). Intended for K8s CronJob triggers,
 * following the same pattern as {@link EscalationController}.
 */
@Slf4j
@RestController
@RequestMapping("/v1/livelihood-summary-email")
@RequiredArgsConstructor
public class LivelihoodSummaryController {

    private final LivelihoodPocSummaryEmailService summaryEmailService;

    @PostMapping("/daily")
    public ResponseEntity<Map<String, Object>> sendDailySummaryEmail(
            @RequestBody(required = false) LivelihoodSummaryEmailRequest request) {
        try {
            log.info("Starting Livelihood daily POC summary digest");
            int sent = summaryEmailService.runSummaryEmails(request, false);
            Map<String, Object> response = new HashMap<>();
            response.put("emailsSent", sent);
            response.put("cadence", "DAILY");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error during Livelihood daily summary digest", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Daily summary digest failed: " + e.getMessage()));
        }
    }

    @PostMapping("/weekly")
    public ResponseEntity<Map<String, Object>> sendWeeklySummaryEmail(
            @RequestBody(required = false) LivelihoodSummaryEmailRequest request) {
        try {
            log.info("Starting Livelihood weekly POC summary digest");
            int sent = summaryEmailService.runSummaryEmails(request, true);
            Map<String, Object> response = new HashMap<>();
            response.put("emailsSent", sent);
            response.put("cadence", "WEEKLY");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error during Livelihood weekly summary digest", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Weekly summary digest failed: " + e.getMessage()));
        }
    }
}
