package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.Facility;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.VisitReport;
import org.egov.amc.web.models.VisitReportDocument;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
 * The layout is the client's AMC_Report_Format_Final ({@link #clientFormat}). The other keys belong to the earlier
 * placeholder layout, kept so that this service and the config can be deployed in either order.
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
    private static final String NOT_APPLICABLE = "N/A";
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter DAY_TIME = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    static final DateTimeFormatter CLIENT_DAY = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);
    static final DateTimeFormatter CLIENT_DAY_TIME = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH);
    private static final ObjectMapper JSON = new ObjectMapper();

    /** The workflow step this PDF is made for. {@code comment} may be D8's JSON list [{reason, comment}]. */
    public record Step(String action, String statusAfter, String actorName, Long actedAt, String comment) {
    }

    public record Input(ScheduledVisit visit, VisitReport report, Facility facility, AmcConfiguration configuration,
                        String vendorName, String projectName, String state, String district, String block,
                        String fieldStaffName, String fieldStaffMobile, Map<String, Object> siteDetails, Step step) {
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
        // submit, and the code verification, which stamps the dates in the same request
        boolean submitting = "SUBMIT_VISIT_REPORT".equals(step.action()) || verifying(step.action());
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
        d.putAll(clientFormat(in));
        return d;
    }

    // ---- client format (AMC_Report_Format_Final) ------------------------------------------------

    /**
     * Section 4, in the client's order: data key -> form answer. A question the report has no answer for prints "-"; it
     * must not borrow another question's answer.
     */
    static final Map<String, String> OBSERVATIONS = observations();

    static Map<String, Object> clientFormat(Input in) {
        VisitReport report = in.report();
        Map<String, Object> answers = report != null && report.getResponses() != null ? report.getResponses() : Map.of();
        Map<String, Object> site = in.siteDetails() != null ? in.siteDetails() : Map.of();
        Map<String, Object> d = new LinkedHashMap<>();

        d.put("visit_date", visitDate(answers.get("visitDate")));
        d.put("service_by", clean(answers.get("serviceBy") != null ? answers.get("serviceBy") : in.fieldStaffName()));
        d.put("service_by_phone", clean(answers.get("serviceByPhone") != null ? answers.get("serviceByPhone") : in.fieldStaffMobile()));
        d.put("installation_date", site.get("installationDate") instanceof Number n ? format(n.longValue(), CLIENT_DAY) : NONE);
        d.put("pin_code", clean(site.get("pinCode")));
        d.put("purchase_order_number", clean(site.get("purchaseOrderNumber")));
        d.put("pcu_priority", clean(priority(answers.get("pcuPriority"))));
        d.put("panels_per_string", clean(value(answers.get("panelsPerString"))));
        OBSERVATIONS.forEach((key, answer) -> {
            String text = clean(value(answers.get(answer)));
            d.put(key, text);
            d.put(key + "_style", answerStyle(text));
        });
        d.put("reading_rows", readingRows(report, answers, (String) site.get("systemType")));
        d.put("vendor_remarks", clean(answers.get("vendorRemarks")));
        d.put("end_user_remarks", clean(answers.get("endUserRemarks")));

        Long verifiedAt = verifiedAt(in);
        d.put("verified_at", format(verifiedAt, CLIENT_DAY_TIME));
        d.put("verification_status", verifiedAt == null ? "Pending" : "Success");
        d.put("verification_id", verifiedAt == null ? NONE : verificationId(in.visit().getId(), verifiedAt));
        d.put("technician_mobile", clean(in.fieldStaffMobile()));
        d.put("submitted_at", format(submittedAt(in, verifiedAt), CLIENT_DAY_TIME));
        return d;
    }

    /**
     * 5.1 to 5.11 always. A reading that does not apply prints N/A: Grid SPD on a DC system, and specific gravity when
     * it was not asked (not a lead acid battery). Solar SPD is asked on every system (#276): it prints its answer, "-"
     * on a DC report without one, and N/A on any other report without one (AC reports sent before #276 never had it).
     * For any other system type Grid SPD prints its answer, or N/A when it has neither an answer nor a photo.
     */
    static List<Map<String, Object>> readingRows(VisitReport report, Map<String, Object> a, String systemType) {
        List<Map<String, Object>> rows = new ArrayList<>();
        rows.add(reading(report, "5.1", "Neutral to earth voltage at PCU output (V)", volts(a.get("neVoltagePcuOutput")), "AMC_PHOTO_NE_PCU"));
        rows.add(reading(report, "5.2", "Neutral to earth voltage for grid input (V)", volts(a.get("neVoltageGridInput")), "AMC_PHOTO_NE_GRID"));
        rows.add(reading(report, "5.3", "Inverter output voltage, with solar and grid disconnected and battery connected (V)",
                volts(a.get("inverterOutputVoltage")), null));
        rows.add(reading(report, "5.4", "Earthing electrode available", value(a.get("earthingElectrodeAvailable")), null));
        rows.add(reading(report, "5.5", "Earthing wire connected to earth pit", value(a.get("earthingWireConnected")), null));
        boolean gravity = answered(a.get("batterySpecificGravity"));
        rows.add(reading(report, "5.6", "Battery specific gravity, measured through hydrometer",
                gravity ? value(a.get("batterySpecificGravity")) : NOT_APPLICABLE, null));
        rows.add(reading(report, "5.7", "Action taken (for specific gravity)",
                gravity ? a.get("batterySpecificGravityAction") : NOT_APPLICABLE, null));
        boolean solar = spdApplies("DC", null, systemType, a.get("solarSpdStatus"), report, "AMC_PHOTO_SOLAR_SPD");
        rows.add(reading(report, "5.8", "Solar SPD", solar ? value(a.get("solarSpdStatus")) : NOT_APPLICABLE,
                solar ? "AMC_PHOTO_SOLAR_SPD" : null));
        rows.add(reading(report, "5.9", "Solar SPD action taken", solar ? a.get("solarSpdAction") : NOT_APPLICABLE, null));
        boolean grid = spdApplies("AC", "DC", systemType, a.get("gridSpdStatus"), report, "AMC_PHOTO_GRID_SPD");
        rows.add(reading(report, "5.10", "Grid input SPD", grid ? value(a.get("gridSpdStatus")) : NOT_APPLICABLE,
                grid ? "AMC_PHOTO_GRID_SPD" : null));
        rows.add(reading(report, "5.11", "Grid input SPD action taken", grid ? a.get("gridSpdAction") : NOT_APPLICABLE, null));
        return rows;
    }

    /**
     * ownType: the system type this SPD is always asked on; otherType: the one it never applies to, or null.
     * On any other type the row applies when it has a status or an uploaded photo.
     */
    private static boolean spdApplies(String ownType, String otherType, String systemType, Object answer,
                                      VisitReport report, String photoType) {
        String type = systemType == null ? "" : systemType.trim();
        if (ownType.equalsIgnoreCase(type)) {
            return true;
        }
        return (otherType == null || !otherType.equalsIgnoreCase(type))
                && (answered(answer) || firstFileStoreId(report, photoType) != null);
    }

    private static boolean answered(Object v) {
        return v != null && !String.valueOf(v).isBlank();
    }

    /** The template draws the photo whose flag is "1"; "" is false in the template. */
    private static Map<String, Object> reading(VisitReport report, String no, String label, Object value, String photoType) {
        String photo = photoType != null && firstFileStoreId(report, photoType) != null ? photoType : null;
        String text = clean(value);
        return row("no", no, "label", label, "value", text, "style", answerStyle(text), "photo", photo == null ? "" : "1",
                "p_ne_pcu", "AMC_PHOTO_NE_PCU".equals(photo) ? "1" : "",
                "p_ne_grid", "AMC_PHOTO_NE_GRID".equals(photo) ? "1" : "",
                "p_solar_spd", "AMC_PHOTO_SOLAR_SPD".equals(photo) ? "1" : "",
                "p_grid_spd", "AMC_PHOTO_GRID_SPD".equals(photo) ? "1" : "");
    }

    /** Template style: real answers are bold, "-" and "N/A" are not. */
    private static String answerStyle(String text) {
        return NONE.equals(text) || NOT_APPLICABLE.equals(text) ? "plain" : "ans";
    }

    private static String volts(Object v) {
        String s = value(v);
        return v instanceof Number || s.matches("-?\\d+(\\.\\d+)?") ? s + " V" : s;
    }

    private static String priority(Object v) {
        return switch (String.valueOf(v)) {
            case "SOLAR_BATTERY_GRID" -> "Solar-Battery-Grid";
            case "SOLAR_GRID_BATTERY" -> "Solar-Grid-Battery";
            default -> value(v);
        };
    }

    /** The app sends yyyy-MM-dd; anything else is shown as typed. */
    private static String visitDate(Object v) {
        try {
            return v == null ? NONE : LocalDate.parse(String.valueOf(v)).format(CLIENT_DAY);
        } catch (DateTimeParseException e) {
            return clean(v);
        }
    }

    /** When the end user's code was verified; null before that (the submit PDF is made before the code is entered). */
    private static Long verifiedAt(Input in) {
        String action = in.step().action();
        if ("SUBMIT_VISIT_REPORT".equals(action)) {
            return null;
        }
        if (verifying(action)) {
            return in.step().actedAt(); // kept only if the code turns out right
        }
        Long at = in.report() != null ? in.report().getOtpVerifiedAt() : null;
        return LivelihoodAmc.isSet(at) ? at : null;
    }

    /** The two steps the end user's code can lead to. */
    private static boolean verifying(String action) {
        return LivelihoodCodeVerify.AUTO_APPROVE.equals(action) || LivelihoodCodeVerify.SUBMIT_OTP.equals(action);
    }

    /** The submit time: now on submit, else when the submit-step PDF was made, else the code verification. */
    private static Long submittedAt(Input in, Long verifiedAt) {
        if ("SUBMIT_VISIT_REPORT".equals(in.step().action())) {
            return in.step().actedAt();
        }
        Long submittedAt = LivelihoodVisitSubmit.submittedAt(in.visit().getAdditionalDetails());
        return submittedAt != null ? submittedAt : verifiedAt;
    }

    /** SF-UV-YYYYMMDD-XXXXXX, as on the installation report: the same verification always gives the same id. */
    static String verificationId(String visitId, long verifiedAt) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest((visitId + "|" + verifiedAt).getBytes(StandardCharsets.UTF_8));
            String code = new BigInteger(1, digest).mod(BigInteger.valueOf(36).pow(6)).toString(36).toUpperCase(Locale.ROOT);
            return "SF-UV-" + Instant.ofEpochMilli(verifiedAt).atZone(IST).toLocalDate().format(DateTimeFormatter.BASIC_ISO_DATE)
                    + "-" + "0".repeat(6 - code.length()) + code;
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    static String format(Long epochMillis, DateTimeFormatter f) {
        return LivelihoodAmc.isSet(epochMillis) ? Instant.ofEpochMilli(epochMillis).atZone(IST).format(f) : NONE;
    }

    private static Map<String, String> observations() {
        String[] answers = {"obsPanelCablesTied", "obsPanelsClean", "obsMmsRusting", "obsNutsBoltsRusting", "obsAjbMounted",
                "obsBatteryTerminalsClean", "obsPetroleumJelly", "obsFloatIndicators", "obsDistilledWaterLevel", "obsPcuCablesIntact",
                "obsLaInsulation", "obsLaFixed", "obsGiStripsInsulated", "obsDownConductorConduit", "obsEarthCableContact",
                "obsEarthElectrodesBuried", "obsCablesCrimped", "obsCablesDamaged", "obsMc4Intact"};
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < answers.length; i++) {
            m.put("obs_" + (i + 1), answers[i]);
        }
        return java.util.Collections.unmodifiableMap(m);
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
            case "SUBMIT_OTP" -> "Code verified";
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
