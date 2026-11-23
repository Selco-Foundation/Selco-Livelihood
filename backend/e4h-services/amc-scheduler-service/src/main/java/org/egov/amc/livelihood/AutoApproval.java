package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Auto-approval rule check (LLD §6.8): the report's readings against MDMS AMC.AutoApprovalRules.
 * Pure and side-effect free. "When unsure, send to a reviewer":
 * <ul>
 *   <li>(a) rule not for the site's system type: skipped</li>
 *   <li>(b) reading missing / blank: fail; (c) "N/A": fail; (d) numeric rule, not a number: fail</li>
 *   <li>(e) system type unknown (blank or LIVELIHOOD), or not covered by any system-specific rule (a new type
 *       without its own rule yet, or a typing mistake): never passes. Every rule is still judged, so the reviewer
 *       sees the readings.</li>
 * </ul>
 * Operators: LT (reading &lt; max), BETWEEN (min &le; reading &le; max), EQ (same text, case-insensitive; true/false = YES/NO).
 */
public final class AutoApproval {

    private AutoApproval() {
    }

    public record Rule(String code, String fieldName, String labelKey, String operator, BigDecimal min, BigDecimal max,
                       String value, String unit, String acceptedRangeKey, List<String> appliesToSystemTypes) {

        boolean forAllSystemTypes() {
            return appliesToSystemTypes == null || appliesToSystemTypes.isEmpty();
        }
    }

    /** Active rules from the MDMS response ({@code MdmsRes.AMC.AutoApprovalRules}). */
    public static List<Rule> parse(JsonNode mdmsResponse) {
        List<Rule> out = new ArrayList<>();
        JsonNode list = mdmsResponse == null ? null : mdmsResponse.path("MdmsRes").path("AMC").path("AutoApprovalRules");
        if (list == null || !list.isArray()) {
            return out;
        }
        for (JsonNode n : list) {
            if (!n.path("active").asBoolean(true) || !n.hasNonNull("code") || !n.hasNonNull("fieldName") || !n.hasNonNull("operator")) {
                continue;
            }
            List<String> types = new ArrayList<>();
            n.path("appliesToSystemTypes").forEach(t -> types.add(t.asText()));
            out.add(new Rule(n.get("code").asText(), n.get("fieldName").asText(), text(n, "labelKey"),
                    n.get("operator").asText().toUpperCase(Locale.ROOT), number(n, "min"), number(n, "max"), text(n, "value"),
                    text(n, "unit"), text(n, "acceptedRangeKey"), types));
        }
        return out;
    }

    /** The installation's Solution has no system type. */
    public static boolean unknownSystemType(String systemType) {
        return systemType == null || systemType.isBlank() || "LIVELIHOOD".equalsIgnoreCase(systemType.trim());
    }

    /** Pattern match for appliesToSystemTypes: "HYBRID_*" = prefix, otherwise exact (case-insensitive). */
    static boolean matches(String pattern, String systemType) {
        String p = pattern.trim().toUpperCase(Locale.ROOT);
        String t = systemType.trim().toUpperCase(Locale.ROOT);
        return p.endsWith("*") ? t.startsWith(p.substring(0, p.length() - 1)) : t.equals(p);
    }

    /**
     * @return {evaluatedAt, passed, systemType, rules:[{code, fieldName, label, labelKey, reading, unit, acceptedRange,
     *         acceptedRangeKey, applicable, passed, reason}]}; passed = the system type is covered and every applicable rule passed
     */
    public static Map<String, Object> evaluate(List<Rule> rules, Map<String, Object> responses, String systemType, long now) {
        boolean unknown = unknownSystemType(systemType);
        // (e): without a rule for this system type nothing would check its own parts (SPD), so it must not pass.
        boolean covered = !unknown && (rules.stream().allMatch(Rule::forAllSystemTypes)
                || rules.stream().anyMatch(r -> !r.forAllSystemTypes() && appliesTo(r, systemType)));

        List<Map<String, Object>> results = new ArrayList<>();
        boolean allPassed = true;
        int applied = 0;
        for (Rule r : rules) {
            Object reading = reading(responses, r);
            boolean applicable = r.forAllSystemTypes() || !covered || appliesTo(r, systemType);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("code", r.code());
            m.put("fieldName", r.fieldName());
            m.put("label", LivelihoodReportPdfData.humanize(r.code()));
            m.put("labelKey", r.labelKey());
            m.put("reading", reading);
            m.put("unit", r.unit());
            m.put("acceptedRange", acceptedRange(r));
            m.put("acceptedRangeKey", r.acceptedRangeKey());
            m.put("applicable", applicable);
            if (applicable) {
                applied++;
                String why = judge(r, reading);
                m.put("passed", why == null);
                m.put("reason", why);
                allPassed &= why == null;
            } else {
                m.put("passed", null);
                m.put("reason", "NOT_APPLICABLE");
            }
            results.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("evaluatedAt", now);
        out.put("passed", covered && allPassed && applied > 0);
        out.put("systemType", unknown ? null : systemType);
        out.put("rules", results);
        return out;
    }

    private static boolean appliesTo(Rule r, String systemType) {
        return r.appliesToSystemTypes().stream().anyMatch(p -> matches(p, systemType));
    }

    /** null = pass, else why it failed. */
    static String judge(Rule r, Object reading) {
        if (!present(reading)) {
            return "MISSING";
        }
        String s = String.valueOf(reading).trim();
        if (isNotApplicable(s)) {
            return "NOT_APPLICABLE_ANSWER";
        }
        switch (r.operator()) {
            case "LT": {
                BigDecimal v = toNumber(reading);
                if (v == null) {
                    return "NOT_A_NUMBER";
                }
                return r.max() != null && v.compareTo(r.max()) < 0 ? null : "OUT_OF_RANGE";
            }
            case "BETWEEN": {
                BigDecimal v = toNumber(reading);
                if (v == null) {
                    return "NOT_A_NUMBER";
                }
                boolean ok = r.min() != null && r.max() != null && v.compareTo(r.min()) >= 0 && v.compareTo(r.max()) <= 0;
                return ok ? null : "OUT_OF_RANGE";
            }
            case "EQ":
                return r.value() != null && r.value().trim().equalsIgnoreCase(asText(reading)) ? null : "NOT_EQUAL";
            default:
                return "UNKNOWN_OPERATOR";
        }
    }

    static String acceptedRange(Rule r) {
        String unit = r.unit() == null ? "" : " " + r.unit();
        return switch (r.operator()) {
            case "LT" -> r.max() == null ? null : "less than " + r.max().stripTrailingZeros().toPlainString() + unit;
            case "BETWEEN" -> r.min() == null || r.max() == null ? null
                    : r.min().stripTrailingZeros().toPlainString() + " to " + r.max().stripTrailingZeros().toPlainString() + unit;
            case "EQ" -> r.value() == null ? null : LivelihoodReportPdfData.humanize(r.value());
            default -> null;
        };
    }

    private static Object reading(Map<String, Object> responses, Rule r) {
        return responses == null ? null : responses.get(r.fieldName());
    }

    static boolean present(Object reading) {
        return reading != null && !String.valueOf(reading).isBlank();
    }

    private static boolean isNotApplicable(String s) {
        String u = s.toUpperCase(Locale.ROOT);
        return u.equals("N/A") || u.equals("NA") || u.equals("NOT_APPLICABLE");
    }

    static BigDecimal toNumber(Object reading) {
        if (reading instanceof Number n) {
            return new BigDecimal(n.toString());
        }
        try {
            return new BigDecimal(String.valueOf(reading).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String asText(Object reading) {
        if (reading instanceof Boolean b) {
            return b ? "YES" : "NO";
        }
        return String.valueOf(reading).trim();
    }

    private static String text(JsonNode n, String field) {
        return n.hasNonNull(field) ? n.get(field).asText() : null;
    }

    private static BigDecimal number(JsonNode n, String field) {
        return n.hasNonNull(field) && n.get(field).isNumber() ? n.get(field).decimalValue() : null;
    }
}
