package org.selco.e4h.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

import static org.selco.e4h.util.IMConstants.*;

@Service
@RequiredArgsConstructor
public class LivelihoodSummaryCountService {

    private final LivelihoodSummaryElasticsearchService elasticsearchService;

    public int count(LivelihoodSummaryEventType eventType,
                     String tenantId,
                     long fromMs,
                     long toMs,
                     List<String> boundaryPrefixes) {
        if (!eventType.isImTicketMetric()) {
            return 0;
        }
        if (boundaryPrefixes == null || boundaryPrefixes.isEmpty()) {
            return 0;
        }

        return switch (eventType) {
            case NEW_TICKETS -> elasticsearchService.countCreatedBetween(tenantId, fromMs, toMs, boundaryPrefixes);
            case SLA_BREACHES -> elasticsearchService.countSlaBreaches(tenantId, fromMs, toMs, boundaryPrefixes);
            case OUT_OF_SCOPE -> elasticsearchService.countLastModifiedWithStatus(
                    tenantId, fromMs, toMs, boundaryPrefixes, LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC, null);
            case QUOTATIONS_PENDING -> elasticsearchService.countLastModifiedWithStatus(
                    tenantId, fromMs, toMs, boundaryPrefixes, LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR, null);
            case CLOSED_WITHOUT_RESOLUTION -> elasticsearchService.countLastModifiedWithStatus(
                    tenantId, fromMs, toMs, boundaryPrefixes, LIVELIHOOD_CLOSED_AFTER_DECLINE, "declinereason");
            case VENDOR_DECLINED -> elasticsearchService.countVendorDeclined(tenantId, fromMs, toMs, boundaryPrefixes);
            case SLA_NEARING -> elasticsearchService.countSlaNearing(tenantId, boundaryPrefixes);
            default -> 0;
        };
    }
}
