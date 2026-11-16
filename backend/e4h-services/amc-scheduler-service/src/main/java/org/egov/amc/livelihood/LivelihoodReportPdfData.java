package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.VisitReport;
import org.egov.amc.web.models.VisitReportDocument;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;

import static org.egov.amc.livelihood.LivelihoodAmc.IST;

/**
 * Builds the {@code amc} object sent to pdf-service for the Livelihood AMC report (LLD §6.10).
 * Pure: every look-up (vendor, project, boundary names, field staff) is done by the caller.
 * <p>
 * The keys here are the contract with Configs-Livelihood {@code pdf-service/data-config/amc-report.json}.
 * The layout is a placeholder until the client's PDF format arrives; only the config files change then.
 * <p>
 * pdf-service pastes values into a JSON template and re-parses it, so every value is a plain string
 * with no double quotes, backslashes, brackets or braces ({@link #clean}).
 */
public final class LivelihoodReportPdfData {

    private LivelihoodReportPdfData() {
    }

    /** One photo per document type (10-report-form §7); each gets its own slot in the PDF. */
    public static final Map<String, String> PHOTO_SLOTS = photoSlots();

    static final String NONE = "-";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DAY_TIME = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    private static final ObjectMapper JSON = new ObjectMapper();

    /** The workflow step this PDF is made for. {@code comment} may be D8's JSON list [{reason, comment}]. */
    public record Step(String action, String statusAfter, String actorName, Long actedAt, String comment) {
    }

    public record Input(ScheduledVisit visit, VisitReport report, Facility facility, AmcConfiguration configuration,
                        String vendorName, String projectName, String state, String district, String block,
                        String fieldStaffName, Step step) {
    }

    public static Map<String, Object> build(Input in) {
        ScheduledVisit visit = in.visit();
        VisitReport report = in.report();
        Facility facility = in.facility();
        AmcConfiguration cfg = in.configuration();
        Step step = in.step();

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("report_id", visit.getId());
        d.put("tenantId", visit.getTenantId());
        d.put("report_status", clean(statusLabel(step.statusAfter() != null ? step.statusAfter() : visit.getStatus())));
        d.put("amc_number", clean(amcNumber(visit, cfg)));

        d.put("end_user_name", clean(facility != null ? facility.getFacilityName() : visit.getFacilityName()));
        d.put("end_user_phone", clean(facility != null ? facility.getFacilityPocPhone() : null));
        d.put("state", clean(in.state()));
        d.put("district", clean(in.district()));
        d.put("block", clean(in.block()));
        d.put("vendor_name", clean(in.vendorName()));
        d.put("field_staff_name", clean(in.fieldStaffName()));
        d.put("project_name", clean(in.projectName()));

        d.put("scheduled_date", day(visit.getScheduledDate()));
        d.put("amc_start_date", day(cfg != null ? cfg.getConfigurationStartDate() : null));
        d.put("amc_end_date", day(cfg != null ? cfg.getConfigurationEndDate() : null));
        boolean submitting = "SUBMIT_VISIT_REPORT".equals(step.action());
        Long first = visit.getFirstSubmissionDate() != null ? visit.getFirstSubmissionDate() : (submitting ? step.actedAt() : null);
        Long latest = submitting ? step.actedAt() : visit.getLatestSubmissionDate();
        d.put("first_submission_date", day(first));
        d.put("latest_submission_date", day(latest));

        Map<String, Object> systemStatus = systemStatus(report, visit);
        d.put("system_in_use", clean(yesNo(systemStatus.get("isSystemInUse"))));
        d.put("system_functional", clean(yesNo(systemStatus.get("isSystemFunctional"))));

        d.put("step_action", clean(actionLabel(step.action())));
        d.put("step_by", clean(step.actorName()));
        d.put("step_at", dayTime(step.actedAt()));
        d.put("step_comment", clean(comment(step.comment())));

        d.put("responses", responses(report));
        d.put("readings", readings(visit));
        d.put("documents", documents(report));
        // A photo slot is left out when that photo is missing, so pdf-service draws a blank, not an error.
        PHOTO_SLOTS.forEach((type, key) -> {
            String id = firstFileStoreId(report, type);
            if (id != null) {
                d.put(key, id);
            }
        });
        return d;
    }

    // ---- sections -----------------------------------------------------------------------------

    static List<Map<String, Object>> responses(VisitReport report) {
        List<Map<String, Object>> rows = new ArrayList<>();
        if (report != null && report.getResponses() != null) {
            report.getResponses().forEach((key, value) -> rows.add(row("label", clean(humanize(key)), "value", clean(value(value)))));
        }
        return rows.isEmpty() ? List.of(row("label", "No answers recorded", "value", NONE)) : rows;
    }

    /** Auto-approval results written by step 3.2 under additional_details.autoApproval.rules. */
    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> readings(ScheduledVisit visit) {
        List<Map<String, Object>> rows = new ArrayList<>();
        Object auto = visit.getAdditionalDetails() != null ? visit.getAdditionalDetails().get("autoApproval") : null;
        Object rules = auto instanceof Map<?, ?> m ? m.get("rules") : null;
        if (rules instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> rule)) {
                    continue;
                }
                Map<String, Object> r = (Map<String, Object>) rule;
                String reading = value(first(r, "reading", "value", "actual"));
                Object unit = r.get("unit");
                if (unit != null && !NONE.equals(reading)) {
                    reading = reading + " " + unit;
                }
                Object passed = r.get("passed");
                rows.add(row("parameter", clean(value(first(r, "label", "parameter", "labelKey", "fieldName", "code"))),
                        "reading", clean(reading),
                        "accepted", clean(value(first(r, "acceptedRange", "acceptedRangeKey"))),
                        "result", passed == null ? NONE : (Boolean.TRUE.equals(passed) || "true".equalsIgnoreCase(String.valueOf(passed)) ? "Pass" : "Fail")));
            }
        }
        return rows.isEmpty() ? List.of(row("parameter", "Not evaluated yet", "reading", NONE, "accepted", NONE, "result", NONE)) : rows;
    }

    static List<Map<String, Object>> documents(VisitReport report) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        if (report != null && report.getDocuments() != null) {
            for (VisitReportDocument doc : report.getDocuments()) {
                if (doc != null && doc.getFileStoreId() != null) {
                    counts.merge(doc.getDocumentType() == null ? "UNKNOWN" : doc.getDocumentType(), 1, Integer::sum);
                }
            }
        }
        List<Map<String, Object>> rows = new ArrayList<>();
        counts.forEach((type, n) -> rows.add(row("documentType", clean(humanize(type)), "count", String.valueOf(n))));
        return rows.isEmpty() ? List.of(row("documentType", "No photos", "count", "0")) : rows;
    }

    // ---- helpers --------------------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    static Map<String, Object> systemStatus(VisitReport report, ScheduledVisit visit) {
        for (Map<String, Object> details : new Map[]{report != null ? report.getAdditionalDetails() : null, visit.getAdditionalDetails()}) {
            if (details != null && details.get("systemStatus") instanceof Map<?, ?> s) {
                return (Map<String, Object>) s;
            }
        }
        return Map.of();
    }

    static String amcNumber(ScheduledVisit visit, AmcConfiguration cfg) {
        if (visit.getVisitNumber() == null) {
            return null;
        }
        if (cfg == null || cfg.getDurationMonths() == null || cfg.getVisitFrequencyMonths() == null || cfg.getVisitFrequencyMonths() == 0) {
            return String.valueOf(visit.getVisitNumber());
        }
        return visit.getVisitNumber() + " of " + AmcSchedule.totalVisits(cfg.getDurationMonths(), cfg.getVisitFrequencyMonths());
    }

    static String statusLabel(String status) {
        if (status == null) {
            return null;
        }
        return switch (status) {
            case "SCHEDULED" -> "New";
            case "PENDING_OTP_APPROVAL" -> "Waiting for end-user code";
            case "PENDING_APPROVAL" -> "Pending approval";
            case "REJECTED" -> "Sent for rework";
            case "APPROVED" -> "Approved";
            default -> humanize(status);
        };
    }

    static String actionLabel(String action) {
        if (action == null) {
            return null;
        }
        return switch (action) {
            case "SUBMIT_VISIT_REPORT" -> "Submitted by field staff";
            case "AUTO_APPROVE" -> "Auto-approved";
            case "APPROVE" -> "Approved by reviewer";
            case "REJECT" -> "Sent for rework by reviewer";
            default -> humanize(action);
        };
    }

    /** D8: the reviewer's comment is a JSON list [{reason, comment}]; anything else is shown as is. */
    static String comment(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String t = raw.trim();
        if (t.startsWith("[")) {
            try {
                JsonNode list = JSON.readTree(t);
                StringJoiner out = new StringJoiner("; ");
                for (JsonNode e : list) {
                    String reason = humanize(e.path("reason").asText(""));
                    String text = e.path("comment").asText("");
                    out.add(reason.isEmpty() ? text : (text.isEmpty() ? reason : reason + ": " + text));
                }
                return out.toString();
            } catch (Exception ignored) {
                // not the D8 shape: fall through
            }
        }
        return t;
    }

    static String yesNo(Object v) {
        if (v == null) {
            return null;
        }
        return value(v);
    }

    /** A form answer as display text: Yes/No/N/A for flags, words for UPPER_CASE codes, lists joined. */
    static String value(Object v) {
        if (v == null) {
            return NONE;
        }
        if (v instanceof Boolean b) {
            return b ? "Yes" : "No";
        }
        if (v instanceof Number n) {
            double x = n.doubleValue();
            return x == Math.rint(x) && !Double.isInfinite(x) && Math.abs(x) < 1e15 ? String.valueOf((long) x) : String.valueOf(n);
        }
        if (v instanceof List<?> list) {
            StringJoiner j = new StringJoiner(", ");
            list.forEach(e -> j.add(value(e)));
            return list.isEmpty() ? NONE : j.toString();
        }
        if (v instanceof Map<?, ?> map) {
            StringJoiner j = new StringJoiner(", ");
            map.forEach((k, e) -> j.add(humanize(String.valueOf(k)) + ": " + value(e)));
            return map.isEmpty() ? NONE : j.toString();
        }
        String s = String.valueOf(v).trim();
        if (s.isEmpty()) {
            return NONE;
        }
        switch (s.toUpperCase(Locale.ROOT)) {
            case "YES", "TRUE", "Y":
                return "Yes";
            case "NO", "FALSE", "N":
                return "No";
            case "NA", "N/A", "NOT_APPLICABLE":
                return "N/A";
            default:
                break;
        }
        // option codes: SOLAR_BATTERY_GRID -> "Solar battery grid", WORKING -> "Working"
        return s.matches("[A-Z0-9]+(_[A-Z0-9]+)+") || s.matches("[A-Z]{3,}") ? humanize(s) : s;
    }

    /** neVoltagePcuOutput / AMC_PHOTO_NE_PCU -> "Ne voltage pcu output" / "Amc photo ne pcu". */
    static String humanize(String key) {
        if (key == null || key.isBlank()) {
            return "";
        }
        String spaced = key.replaceAll("([a-z0-9])([A-Z])", "$1 $2").replace('_', ' ').replace('-', ' ').trim()
                .replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        return Character.toUpperCase(spaced.charAt(0)) + spaced.substring(1);
    }

    /** pdf-service re-parses the filled template as JSON: strip what would break it. */
    static String clean(Object v) {
        if (v == null) {
            return NONE;
        }
        String s = String.valueOf(v)
                .replace('"', '\'').replace('\\', '/')
                .replace('[', '(').replace(']', ')').replace('{', '(').replace('}', ')')
                .replaceAll("[\\r\\n\\t]+", " ").trim();
        return s.isEmpty() ? NONE : s;
    }

    static String day(Long epochMillis) {
        return LivelihoodAmc.isSet(epochMillis) ? Instant.ofEpochMilli(epochMillis).atZone(IST).format(DAY) : NONE;
    }

    static String dayTime(Long epochMillis) {
        return LivelihoodAmc.isSet(epochMillis) ? Instant.ofEpochMilli(epochMillis).atZone(IST).format(DAY_TIME) + " IST" : NONE;
    }

    static String firstFileStoreId(VisitReport report, String documentType) {
        if (report == null || report.getDocuments() == null) {
            return null;
        }
        return report.getDocuments().stream()
                .filter(doc -> doc != null && documentType.equalsIgnoreCase(doc.getDocumentType()) && doc.getFileStoreId() != null
                        && !doc.getFileStoreId().isBlank())
                .map(VisitReportDocument::getFileStoreId)
                .findFirst().orElse(null);
    }

    private static Object first(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            if (m.get(k) != null) {
                return m.get(k);
            }
        }
        return null;
    }

    private static Map<String, Object> row(String... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put(kv[i], kv[i + 1]);
        }
        return m;
    }

    private static Map<String, String> photoSlots() {
        Map<String, String> m = new LinkedHashMap<>();
        m.put("AMC_VERIFICATION_PHOTO", "photo_verification_id");
        m.put("AMC_PHOTO_NE_PCU", "photo_ne_pcu_id");
        m.put("AMC_PHOTO_NE_GRID", "photo_ne_grid_id");
        m.put("AMC_PHOTO_SOLAR_SPD", "photo_solar_spd_id");
        m.put("AMC_PHOTO_GRID_SPD", "photo_grid_spd_id");
        return java.util.Collections.unmodifiableMap(m);
    }
}
