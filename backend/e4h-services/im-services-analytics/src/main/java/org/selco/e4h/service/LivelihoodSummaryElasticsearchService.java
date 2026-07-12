package org.selco.e4h.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.selco.e4h.util.ElasticSearchClient;
import org.selco.e4h.util.LivelihoodBoundaryScopeUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.selco.e4h.util.IMConstants.*;

/**
 * Counts Livelihood digest metrics from {@code computed-sla-livelihood-incident-index-v1},
 * following the same Elasticsearch query patterns as E4H escalation / inbox.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LivelihoodSummaryElasticsearchService {

    private static final String FIELD_TENANT = "Data.tenantId.keyword";
    private static final String FIELD_BUSINESS_SERVICE = "Data.currentProcessInstance.businessService.keyword";
    private static final String FIELD_STATUS = "Data.incident.applicationStatus.keyword";
    private static final String FIELD_STATE_CODE = "Data.incident.boundary.stateCode.keyword";
    private static final String FIELD_CREATED_TIME = "Data.incident.auditDetails.createdTime";
    private static final String FIELD_LAST_MODIFIED = "Data.incident.auditDetails.lastModifiedTime";
    private static final String FIELD_SLA_REMAINING = "Data.slaRemaining";

    private static final String NEARING_SLA_SCRIPT =
            "long stateSla = 0; "
                    + "if (doc.containsKey('Data.stateSla') && doc['Data.stateSla'].size() > 0) { "
                    + "  stateSla = doc['Data.stateSla'].value; "
                    + "} else if (doc.containsKey('Data.stateSLA') && doc['Data.stateSLA'].size() > 0) { "
                    + "  stateSla = doc['Data.stateSLA'].value; "
                    + "} "
                    + "return doc.containsKey('Data.slaRemaining') && doc['Data.slaRemaining'].size() > 0 "
                    + "&& stateSla > 0 "
                    + "&& doc['Data.slaRemaining'].value > 0 "
                    + "&& ((double) doc['Data.slaRemaining'].value / stateSla) <= 0.3";

    private final ElasticSearchClient elasticSearchClient;

    public int countCreatedBetween(String tenantId, long fromMs, long toMs, List<String> boundaryPrefixes) {
        List<Map<String, Object>> must = baseMust(tenantId, boundaryPrefixes);
        must.add(rangeClause(FIELD_CREATED_TIME, fromMs, toMs));
        return executeCount(must, List.of());
    }

    public int countSlaBreaches(String tenantId, long fromMs, long toMs, List<String> boundaryPrefixes) {
        List<Map<String, Object>> must = baseMust(tenantId, boundaryPrefixes);
        must.add(termsClause(FIELD_STATUS, List.of(LIVELIHOOD_PENDING_FOR_RESOLUTION)));
        must.add(rangeClause(FIELD_LAST_MODIFIED, fromMs, toMs));
        must.add(rangeLte(FIELD_SLA_REMAINING, 0));
        return executeCount(must, List.of());
    }

    public int countSlaNearing(String tenantId, List<String> boundaryPrefixes) {
        List<Map<String, Object>> must = baseMust(tenantId, boundaryPrefixes);
        must.add(termsClause(FIELD_STATUS, List.of(LIVELIHOOD_PENDING_FOR_RESOLUTION)));
        must.add(scriptClause(NEARING_SLA_SCRIPT));
        return executeCount(must, List.of());
    }

    public int countLastModifiedWithStatus(String tenantId,
                                           long fromMs,
                                           long toMs,
                                           List<String> boundaryPrefixes,
                                           String status,
                                           String additionalDetailContains) {
        List<Map<String, Object>> must = baseMust(tenantId, boundaryPrefixes);
        must.add(termsClause(FIELD_STATUS, List.of(status)));
        must.add(rangeClause(FIELD_LAST_MODIFIED, fromMs, toMs));
        if (additionalDetailContains != null && !additionalDetailContains.isBlank()) {
            must.add(additionalDetailContainsClause(additionalDetailContains));
        }
        return executeCount(must, List.of());
    }

    public int countVendorDeclined(String tenantId, long fromMs, long toMs, List<String> boundaryPrefixes) {
        int allDeclined = countLastModifiedWithStatus(
                tenantId, fromMs, toMs, boundaryPrefixes, LIVELIHOOD_CLOSED_AFTER_DECLINE, null);
        int pocDeclined = countLastModifiedWithStatus(
                tenantId, fromMs, toMs, boundaryPrefixes, LIVELIHOOD_CLOSED_AFTER_DECLINE, "declinereason");
        return Math.max(0, allDeclined - pocDeclined);
    }

    private List<Map<String, Object>> baseMust(String tenantId, List<String> boundaryPrefixes) {
        List<Map<String, Object>> must = new ArrayList<>();
        must.add(termClause(FIELD_TENANT, tenantId));
        must.add(termClause(FIELD_BUSINESS_SERVICE, LIVELIHOOD_INCIDENT));
        must.add(stateBoundaryPrefixesClause(boundaryPrefixes));
        return must;
    }

    private int executeCount(List<Map<String, Object>> must, List<Map<String, Object>> mustNot) {
        Map<String, Object> bool = new HashMap<>();
        bool.put("must", must);
        if (!mustNot.isEmpty()) {
            bool.put("must_not", mustNot);
        }
        return elasticSearchClient.countDocuments(Map.of("bool", bool));
    }

    private Map<String, Object> stateBoundaryPrefixesClause(List<String> boundaryPrefixes) {
        List<Map<String, Object>> should = new ArrayList<>();
        for (String prefix : boundaryPrefixes) {
            String statePrefix = toStateCodePrefix(prefix);
            if (statePrefix == null || statePrefix.isBlank()) {
                continue;
            }
            Map<String, Object> prefixBody = new HashMap<>();
            prefixBody.put(FIELD_STATE_CODE, statePrefix);
            should.add(Map.of("prefix", prefixBody));
        }
        if (should.isEmpty()) {
            return Map.of("match_none", Map.of());
        }
        if (should.size() == 1) {
            return should.get(0);
        }
        Map<String, Object> bool = new HashMap<>();
        bool.put("should", should);
        bool.put("minimum_should_match", 1);
        return Map.of("bool", bool);
    }

    private static String toStateCodePrefix(String boundaryPrefix) {
        if (boundaryPrefix == null) {
            return null;
        }
        // ES keyword is case-sensitive; Livelihood stores INDIA_KARNATAKA (uppercase).
        String normalized = LivelihoodBoundaryScopeUtil.toEsStateCode(boundaryPrefix.trim());
        if (normalized == null) {
            return null;
        }
        if (normalized.endsWith("_%")) {
            normalized = normalized.substring(0, normalized.length() - 2);
        }
        if (normalized.endsWith("%")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static Map<String, Object> termClause(String field, String value) {
        return Map.of("term", Map.of(field, value));
    }

    private static Map<String, Object> termsClause(String field, List<String> values) {
        return Map.of("terms", Map.of(field, values));
    }

    private static Map<String, Object> rangeClause(String field, long from, long to) {
        return Map.of("range", Map.of(field, Map.of("gte", from, "lte", to)));
    }

    private static Map<String, Object> rangeLte(String field, long value) {
        return Map.of("range", Map.of(field, Map.of("lte", value)));
    }

    private static Map<String, Object> scriptClause(String source) {
        Map<String, Object> innerScript = new HashMap<>();
        innerScript.put("source", source);
        innerScript.put("lang", "painless");
        Map<String, Object> scriptWrapper = new HashMap<>();
        scriptWrapper.put("script", innerScript);
        return Map.of("script", scriptWrapper);
    }

    private static Map<String, Object> additionalDetailContainsClause(String text) {
        Map<String, Object> queryString = new HashMap<>();
        queryString.put("query", "*" + text.toLowerCase(Locale.ROOT) + "*");
        queryString.put("fields", List.of("Data.incident.additionalDetail"));
        queryString.put("analyze_wildcard", true);
        return Map.of("query_string", queryString);
    }
}
