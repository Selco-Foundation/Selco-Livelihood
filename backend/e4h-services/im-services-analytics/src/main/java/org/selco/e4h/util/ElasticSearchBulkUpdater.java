package org.selco.e4h.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.selco.e4h.config.ConsumerConfiguration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Partial-document bulk writer for Elasticsearch.
 *
 * <p>Every write goes out as a bulk {@code update} with a {@code doc} body, which Elasticsearch
 * merges recursively into the stored document. Only the keys handed in are touched; everything
 * else on the document — SLA numbers, workflow state, geo-point, escalations — survives. That is
 * what makes this safe to run against a populated index, unlike republishing through the indexer
 * Kafka topics, where egov-indexer would rewrite each document in full.
 *
 * <p>A document that is missing from the index is reported separately from a genuine failure: a
 * backfill driven off the database will always name some ids the index never received, and that
 * is expected rather than an error.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ElasticSearchBulkUpdater {

    private static final String BULK_ENDPOINT = "_bulk";
    private static final String DOCUMENT_MISSING = "document_missing_exception";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ConsumerConfiguration config;
    private final UpdateUtils updateUtils;

    /** Tally of one or more bulk requests. */
    public record BulkResult(int updated, int missing, int failed) {

        public static BulkResult empty() {
            return new BulkResult(0, 0, 0);
        }

        public BulkResult plus(BulkResult other) {
            return new BulkResult(updated + other.updated, missing + other.missing, failed + other.failed);
        }
    }

    /**
     * Merges each partial document into the indexed document with the matching id.
     *
     * @param index    index to write to
     * @param docsById document id to the fields being merged in; entries with no fields are skipped
     *                 so an empty partial never costs a bulk slot
     * @param chunkSize documents per bulk request
     */
    public BulkResult bulkPartialUpdate(String index, Map<String, Map<String, Object>> docsById, int chunkSize) {
        if (docsById == null || docsById.isEmpty()) {
            return BulkResult.empty();
        }

        List<Map.Entry<String, Map<String, Object>>> pending = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : docsById.entrySet()) {
            if (entry.getKey() != null && !entry.getKey().isBlank()
                    && entry.getValue() != null && !entry.getValue().isEmpty()) {
                pending.add(entry);
            }
        }

        BulkResult total = BulkResult.empty();
        for (int i = 0; i < pending.size(); i += chunkSize) {
            List<Map.Entry<String, Map<String, Object>>> chunk =
                    pending.subList(i, Math.min(i + chunkSize, pending.size()));
            total = total.plus(sendChunk(index, chunk));
        }
        return total;
    }

    private BulkResult sendChunk(String index, List<Map.Entry<String, Map<String, Object>>> chunk) {
        String body = buildNdJson(index, chunk);
        if (body.isEmpty()) {
            return BulkResult.empty();
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.add("Authorization", updateUtils.getESEncodedCredentials());

            ResponseEntity<Map> response = restTemplate.exchange(
                    getBaseUrl() + "/" + BULK_ENDPOINT,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class);

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("Bulk update on index {} returned {}", index, response.getStatusCode());
                return new BulkResult(0, 0, chunk.size());
            }
            return tally(index, response.getBody(), chunk.size());

        } catch (Exception e) {
            log.error("Bulk update of {} documents on index {} failed", chunk.size(), index, e);
            return new BulkResult(0, 0, chunk.size());
        }
    }

    /**
     * Builds the newline-delimited action/payload pairs the bulk API expects. A document whose
     * payload cannot be serialised is dropped rather than failing the whole chunk, so one bad row
     * cannot cost the other few hundred in the same request.
     */
    private String buildNdJson(String index, List<Map.Entry<String, Map<String, Object>>> chunk) {
        StringBuilder ndJson = new StringBuilder();
        for (Map.Entry<String, Map<String, Object>> entry : chunk) {
            Map<String, Object> action = Map.of("update", Map.of("_index", index, "_id", entry.getKey()));
            Map<String, Object> payload = Map.of("doc", entry.getValue());
            try {
                ndJson.append(objectMapper.writeValueAsString(action)).append('\n');
                ndJson.append(objectMapper.writeValueAsString(payload)).append('\n');
            } catch (Exception e) {
                log.warn("Skipping document {} on index {}: payload could not be serialised", entry.getKey(), index, e);
            }
        }
        return ndJson.toString();
    }

    @SuppressWarnings("unchecked")
    private BulkResult tally(String index, Map<String, Object> responseBody, int chunkSize) {
        if (responseBody == null || !(responseBody.get("items") instanceof List<?> items)) {
            log.warn("Bulk response for index {} had no items array; counting {} documents as failed", index, chunkSize);
            return new BulkResult(0, 0, chunkSize);
        }

        int updated = 0;
        int missing = 0;
        int failed = 0;

        for (Object item : items) {
            if (!(item instanceof Map<?, ?> itemMap) || !(itemMap.get("update") instanceof Map<?, ?> update)) {
                failed++;
                continue;
            }
            Object error = update.get("error");
            if (error == null) {
                updated++;
            } else if (error instanceof Map<?, ?> errorMap && DOCUMENT_MISSING.equals(errorMap.get("type"))) {
                missing++;
            } else {
                failed++;
                log.warn("Bulk update error on index {} for id {}: {}", index, update.get("_id"), error);
            }
        }
        return new BulkResult(updated, missing, failed);
    }

    /**
     * Drops null values so a partial update never overwrites an indexed value with nothing. Callers
     * that genuinely mean "clear this field" must not route through here.
     */
    public static Map<String, Object> nonNullFields(Map<String, Object> fields) {
        Map<String, Object> result = new LinkedHashMap<>();
        fields.forEach((key, value) -> {
            if (value != null) {
                result.put(key, value);
            }
        });
        return result;
    }

    private String getBaseUrl() {
        return config.getEsHostName() + ":" + config.getEsPortNo();
    }
}
