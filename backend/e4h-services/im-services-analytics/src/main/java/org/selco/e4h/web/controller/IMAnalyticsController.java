package org.selco.e4h.web.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.selco.e4h.kafka.consumer.KafkaProducerService;
import org.selco.e4h.service.IncidentService;
import org.selco.e4h.service.IndexBackfillService;
import org.selco.e4h.service.PrioritySLAService;
import org.selco.e4h.web.models.IncidentRequest;
import org.selco.e4h.web.models.IncidentRequestWrapper;
import org.selco.e4h.web.models.IndexBackfillSummary;
import org.selco.e4h.web.models.SLARequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class IMAnalyticsController {

    private final PrioritySLAService slaService;
    private final KafkaProducerService producerService;
    private final IncidentService incidentService;
    private final IndexBackfillService indexBackfillService;

    @PostMapping("/computeSLA")
    public ResponseEntity<String> computeSLA(
            @Valid @RequestBody SLARequest request,
            @RequestParam(name = "transform", defaultValue = "false") boolean transform,
            @RequestParam(name = "closedtickets", defaultValue = "false") boolean closedTickets
    ) {
        try {
            log.info("SLA computation triggered for tenant: {}, transform={}", request.getTenantId(), transform);
            slaService.computeAndUpdateSLA(request, transform,closedTickets);
            return ResponseEntity.ok("SLA computation completed successfully");
        } catch (Exception e) {
            log.error("Error during SLA computation for tenant: {}", request.getTenantId(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("SLA computation failed: " + e.getMessage());
        }
    }

    /**
     * One-shot repair of documents indexed before these fields existed.
     *
     * <p>Backfills end-user name and contact, facility category and the reopened flag onto the
     * ticket index, and localised state/district/block plus open/closed/total ticket counts onto
     * the facility index. It covers every document in both indices — there is nothing to filter on
     * and no request body.
     *
     * <p>Writes are partial merges, so re-running it is harmless. It runs inline and can take
     * minutes on a large index; the response is the per-index tally.
     */
    @PostMapping("/index/_backfill")
    public ResponseEntity<List<IndexBackfillSummary>> backfillIndices() {
        return ResponseEntity.ok(indexBackfillService.backfillAll());
    }

    @GetMapping("/update_phc")
    public String getTicketByTenantId() {
        incidentService.scriptUpdatePHCAgregation();
        return "Script done!";
    }

    @PostMapping("/test_update_phc")
    public String sendDummyTopicIncident(@Valid @RequestBody IncidentRequest incidentRequest) {
        Map<String, Object> producerRecord = new HashMap<>();
        producerRecord.put("topic", "save-im-request");
        producerRecord.put("value", incidentRequest);
//        producerService.getTicket("sk.shyagyongrumtek");
        producerService.sendIncident("process-audit-records", producerRecord);
        return "User sent!";
    }
//
//    @PostMapping("/test_update_vendor")
//    public String sendDummyTopicVendorName(@Valid @RequestBody IncidentRequestWrapper wrapper) {
//        producerService.sendIncident("update-im-request-indexer", wrapper);
//        return "User sent!";
//    }

}
