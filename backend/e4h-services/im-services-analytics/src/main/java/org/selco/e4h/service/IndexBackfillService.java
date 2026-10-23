package org.selco.e4h.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.common.contract.request.User;
import org.selco.e4h.config.IndexBackfillProperties;
import org.selco.e4h.repository.BackfillRepository;
import org.selco.e4h.repository.IncidentRepository;
import org.selco.e4h.util.ElasticSearchBulkUpdater;
import org.selco.e4h.util.ElasticSearchBulkUpdater.BulkResult;
import org.selco.e4h.util.ElasticSearchClient;
import org.selco.e4h.util.ElasticSearchClient.EsDoc;
import org.selco.e4h.web.models.IncidentStatusAgregation;
import org.selco.e4h.web.models.IndexBackfillSummary;
import org.selco.e4h.web.models.TicketBackfillRow;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Backfills fields onto documents that were indexed before those fields existed.
 *
 * <p>The live create/update path already publishes all of this through the indexer Kafka topics;
 * this exists purely to repair history. It writes partial documents straight to Elasticsearch
 * rather than republishing, because egov-indexer rewrites a document in full and would drop
 * everything the backfill cannot reconstruct — SLA counters, workflow state, geo-point, escalations.
 *
 * <p>Ticket index: end-user name and contact, facility category, reopened flag.
 * <br>Facility index: state, district and block display names, and open/closed/total ticket counts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndexBackfillService {

    private final BackfillRepository backfillRepository;
    private final IncidentRepository incidentRepository;
    private final ElasticSearchClient esClient;
    private final ElasticSearchBulkUpdater bulkUpdater;
    private final Co2LocalizationClient localizationClient;
    private final FacilityRegistryClient facilityRegistryClient;
    private final IndexBackfillProperties properties;

    /** Matches the SYSTEMUSER the im-services data migrations present to other services. */
    private static final String SYSTEM_USER_UUID = "14d6dbdf-e4d2-45c3-9717-c82ba17a9f19";

    public List<IndexBackfillSummary> backfillAll() {
        log.info("Index backfill starting: ticketIndex={} facilityIndex={}",
                properties.getTicketIndex(), properties.getFacilityIndex());
        List<IndexBackfillSummary> summaries = List.of(backfillTicketIndex(), backfillFacilityIndex());
        log.info("Index backfill finished: {}", summaries);
        return summaries;
    }

    /**
     * Walks the incident table in pages, joining in the facility point of contact, the facility
     * category and the reopen history, and merges them onto the matching ticket document.
     *
     * <p>Driven from Postgres rather than from the index so that the incident table stays the
     * source of truth for which tickets exist.
     */
    private IndexBackfillSummary backfillTicketIndex() {
        long startedAt = System.currentTimeMillis();
        String index = properties.getTicketIndex();
        int pageSize = properties.getPageSize();

        int scanned = 0;
        BulkResult result = BulkResult.empty();

        for (int offset = 0; ; offset += pageSize) {
            List<TicketBackfillRow> page = backfillRepository.getTicketBackfillRows(pageSize, offset);
            if (page.isEmpty()) {
                break;
            }
            scanned += page.size();

            Map<String, String> phonesByFacilityId = fetchPocPhones(page);
            Map<String, Map<String, Object>> docsById = new LinkedHashMap<>();
            for (TicketBackfillRow row : page) {
                String phone = row.facilityId() == null ? null : phonesByFacilityId.get(row.facilityId());
                docsById.put(row.incidentId(), Map.of("Data", ticketFields(row, phone)));
            }
            result = result.plus(bulkUpdater.bulkPartialUpdate(index, docsById, properties.getBulkSize()));
            log.info("Ticket backfill progress: scanned={} updated={} missing={} failed={}",
                    scanned, result.updated(), result.missing(), result.failed());

            if (page.size() < pageSize) {
                break;
            }
        }

        return summary(index, scanned, result, startedAt);
    }

    /**
     * One registry round trip per page, for the distinct facilities that page's tickets belong to.
     * Tickets cluster heavily onto a few facilities, so this is far smaller than the page itself.
     */
    private Map<String, String> fetchPocPhones(List<TicketBackfillRow> page) {
        List<String> facilityIds = page.stream()
                .map(TicketBackfillRow::facilityId)
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .toList();
        return facilityRegistryClient.fetchPocPhonesByFacilityIds(systemRequestInfo(), facilityIds);
    }

    /**
     * The reopened flag is always written — including as an explicit {@code false} — so the field
     * is filterable on every ticket. The registry-sourced fields are only written when the registry
     * actually has a value, so a facility with no point of contact on record keeps whatever name
     * the live path resolved from HRMS.
     *
     * @param pocPhone decrypted point-of-contact phone, or null when the registry has none
     */
    private Map<String, Object> ticketFields(TicketBackfillRow row, String pocPhone) {
        Map<String, Object> fields = new LinkedHashMap<>(ElasticSearchBulkUpdater.nonNullFields(mapOf(
                "endUserName", blankToNull(row.endUserName()),
                "endUserMobile", plausiblePhoneOrNull(pocPhone),
                "facilityCategory", blankToNull(row.facilityCategory()))));
        fields.put("isReopened", row.reopened());
        return fields;
    }

    /**
     * Guards against indexing ciphertext. The registry decrypts the point-of-contact phone inside a
     * {@code catch} that swallows enc-service failures and leaves the encrypted value in the
     * response, so a degraded enc-service mid-run would otherwise write base64 into the index and
     * look like a success. Anything that is not phone-shaped is dropped, which leaves whatever the
     * live path already indexed in place.
     */
    private static String plausiblePhoneOrNull(String value) {
        String phone = blankToNull(value);
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("[\\s+()-]", "");
        if (digits.length() < 6 || digits.length() > 15 || !digits.chars().allMatch(Character::isDigit)) {
            log.debug("Skipping point-of-contact phone that does not look decrypted");
            return null;
        }
        return phone;
    }

    /**
     * The facility registry filters out facilities that are not ONM-ready unless the caller holds
     * one of its {@code onm-non-ready.allowed.roles}. A backfill has to see all of them, so it
     * identifies itself as SYSTEM — the same identity the im-services data migrations use.
     */
    private static RequestInfo systemRequestInfo() {
        Role system = Role.builder().code("SYSTEM").name("System user").build();
        User userInfo = User.builder()
                .uuid(SYSTEM_USER_UUID)
                .userName("SYSTEMUSER")
                .name("System User")
                .type("SYSTEM")
                .roles(List.of(system))
                .build();
        return RequestInfo.builder()
                .apiId("im-services-analytics")
                .ver("1.0")
                .msgId("index-backfill")
                .userInfo(userInfo)
                .build();
    }

    /**
     * Scrolls the facility index and merges the localised boundary names and the ticket counts onto
     * each document.
     *
     * <p>The boundary codes come from the document being updated rather than from the database,
     * because the facility index is the only place that already carries the resolved
     * {@code Data.boundary} hierarchy per facility. Ticket counts are read once for every facility
     * up front — one grouped query is far cheaper than one query per page.
     */
    private IndexBackfillSummary backfillFacilityIndex() {
        long startedAt = System.currentTimeMillis();
        String index = properties.getFacilityIndex();

        Map<String, IncidentStatusAgregation> countsByFacilityId = loadTicketCounts();
        log.info("Facility backfill loaded ticket counts for {} facilities", countsByFacilityId.size());

        List<BulkResult> pageResults = new ArrayList<>();
        int scanned = esClient.scrollAllPHC(properties.getPageSize(), page -> {
            Map<String, Map<String, Object>> docsById = buildFacilityUpdates(page, countsByFacilityId);
            pageResults.add(bulkUpdater.bulkPartialUpdate(index, docsById, properties.getBulkSize()));
        });

        BulkResult result = BulkResult.empty();
        for (BulkResult pageResult : pageResults) {
            result = result.plus(pageResult);
        }
        return summary(index, scanned, result, startedAt);
    }

    private Map<String, IncidentStatusAgregation> loadTicketCounts() {
        Map<String, IncidentStatusAgregation> byFacilityId = new HashMap<>();
        // A null facility id means "group every facility", which is what a full backfill wants.
        for (IncidentStatusAgregation aggregation : incidentRepository.getStatusIncidentsAgregation(null)) {
            if (aggregation.getFacilityId() != null && !aggregation.getFacilityId().isBlank()) {
                byFacilityId.put(aggregation.getFacilityId(), aggregation);
            }
        }
        return byFacilityId;
    }

    private Map<String, Map<String, Object>> buildFacilityUpdates(
            List<EsDoc> page, Map<String, IncidentStatusAgregation> countsByFacilityId) {

        Map<String, Boundary> boundaryByDocId = new LinkedHashMap<>();
        Set<String> boundaryCodes = new LinkedHashSet<>();
        for (EsDoc doc : page) {
            Boundary boundary = readBoundary(doc);
            boundaryByDocId.put(doc.id(), boundary);
            boundary.collectCodes(boundaryCodes);
        }

        Map<String, String> names = localizationClient.resolveBoundaryNames(
                null,
                properties.getLocalizationTenantId(),
                properties.getLocalizationModule(),
                boundaryCodes);

        Map<String, Map<String, Object>> docsById = new LinkedHashMap<>();
        for (EsDoc doc : page) {
            Boundary boundary = boundaryByDocId.get(doc.id());
            Map<String, Object> fields = new LinkedHashMap<>(ElasticSearchBulkUpdater.nonNullFields(mapOf(
                    "state", names.get(boundary.stateCode()),
                    "district", names.get(boundary.districtCode()),
                    "block", names.get(boundary.blockCode()))));

            // The document id is the facility id; fall back to the source for the handful of
            // documents indexed before the id convention settled.
            String facilityId = doc.id() != null ? doc.id() : stringAt(doc.source(), "facilityId");
            IncidentStatusAgregation counts = countsByFacilityId.get(facilityId);
            // A facility with no tickets is written as zero rather than skipped, so a facility
            // whose last ticket was deleted does not keep showing a stale count.
            fields.put("total_tickets", counts == null ? 0 : counts.getTotalOccurences());
            fields.put("open_tickets", counts == null ? 0 : counts.getTotalOpenOccurrences());
            fields.put("closed_tickets", counts == null ? 0 : counts.getTotalCloseOccurrences());

            docsById.put(doc.id(), Map.of("Data", fields));
        }
        return docsById;
    }

    /** Boundary codes for one facility document. */
    private record Boundary(String stateCode, String districtCode, String blockCode) {

        void collectCodes(Set<String> codes) {
            for (String code : new String[]{stateCode, districtCode, blockCode}) {
                if (code != null && !code.isBlank()) {
                    codes.add(code);
                }
            }
        }
    }

    @SuppressWarnings("unchecked")
    private Boundary readBoundary(EsDoc doc) {
        Map<String, Object> data = doc.source() == null ? null : (Map<String, Object>) doc.source().get("Data");
        Map<String, Object> boundary = data == null ? null : (Map<String, Object>) data.get("boundary");
        if (boundary == null) {
            return new Boundary(null, null, null);
        }
        return new Boundary(
                stringAt(boundary, "stateCode"),
                stringAt(boundary, "districtCode"),
                stringAt(boundary, "blockCode"));
    }

    private static String stringAt(Map<String, Object> source, String key) {
        return source != null && source.get(key) instanceof String value ? value : null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    /** {@link Map#of} rejects null values, which is exactly what the callers here need to pass. */
    private static Map<String, Object> mapOf(String k1, Object v1, String k2, Object v2, String k3, Object v3) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put(k1, v1);
        map.put(k2, v2);
        map.put(k3, v3);
        return map;
    }

    private static IndexBackfillSummary summary(String index, int scanned, BulkResult result, long startedAt) {
        return IndexBackfillSummary.builder()
                .index(index)
                .scanned(scanned)
                .updated(result.updated())
                .missing(result.missing())
                .failed(result.failed())
                .durationMs(System.currentTimeMillis() - startedAt)
                .build();
    }
}
