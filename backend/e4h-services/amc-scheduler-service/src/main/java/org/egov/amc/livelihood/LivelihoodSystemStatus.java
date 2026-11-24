package org.egov.amc.livelihood;

import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;
import org.egov.tracer.model.CustomException;
import org.springframework.web.util.HtmlUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * {@code POST /v1/visit/system-status/_update} (LLD §6.7): the app's pre-report questions "system in use?" and
 * "system functional?". In order:
 * <ol>
 *   <li>caller is the visit's current field staff or anyone ever assigned to it (an offline-queued call still counts)</li>
 *   <li>answers stored on the visit only while it is open and live (SCHEDULED, PENDING_OTP_APPROVAL, REJECTED); targeted JDBC</li>
 *   <li>functional = No: Program POC emails must be configured (checked before the claim), then the one-per-visit claim
 *       on non_functional_notified_at; only the caller that wins the claim sends the email</li>
 * </ol>
 * The visit's and the AMC's status never change here.
 */
public final class LivelihoodSystemStatus {

    private LivelihoodSystemStatus() {
    }

    public static final String AMC_PROGRAM_POC_EMAIL_NOT_CONFIGURED = "AMC_PROGRAM_POC_EMAIL_NOT_CONFIGURED";
    public static final String AMC_INVALID_SYSTEM_STATUS = "AMC_INVALID_SYSTEM_STATUS";
    /** The title of the client's email template. */
    static final String EMAIL_SUBJECT = "Solar system non-functional \u2013 {{end_user_name}}";
    public static final Set<String> OPEN_STATUSES = Set.of("SCHEDULED", "PENDING_OTP_APPROVAL", "REJECTED");

    public interface Steps {
        List<String> pocEmails();

        /** Targeted jsonb_set; true when the row was updated. */
        boolean storeAnswers(Map<String, Object> systemStatus);

        /** UPDATE ... SET non_functional_notified_at = now WHERE ... IS NULL; true for the one caller that wins. */
        boolean claim(long now);

        /** The {{placeholders}} of the email; read only when an email is sent. */
        Map<String, String> emailFields();

        void sendEmail(List<String> to, String subject, String body);
    }

    public record Result(boolean stored, boolean emailSent) {
    }

    public static Result run(ScheduledVisit visit, String callerUuid, Boolean inUse, Boolean functional, long now,
                             String subjectTemplate, String bodyTemplate, Steps steps) {
        if (inUse == null || functional == null) {
            throw new CustomException(AMC_INVALID_SYSTEM_STATUS, "systemStatus.isSystemInUse and isSystemFunctional are required");
        }
        if (!everAssigned(visit, callerUuid)) {
            throw new CustomException(LivelihoodVisitSubmit.AMC_VISIT_NOT_ASSIGNED_TO_USER, "This visit is not assigned to you");
        }
        Map<String, Object> answers = new LinkedHashMap<>();
        answers.put("isSystemInUse", inUse);
        answers.put("isSystemFunctional", functional);
        boolean stored = storable(visit) && steps.storeAnswers(answers);

        boolean sent = false;
        if (Boolean.FALSE.equals(functional)) {
            List<String> to = steps.pocEmails();
            if (to == null || to.isEmpty()) {
                throw new CustomException(AMC_PROGRAM_POC_EMAIL_NOT_CONFIGURED, "No Program POC email is configured for AMC notifications");
            }
            if (steps.claim(now)) {
                Map<String, String> f = steps.emailFields();
                steps.sendEmail(to, fill(subjectTemplate, f, false), fill(bodyTemplate, f, true));
                sent = true;
            }
        }
        return new Result(stored, sent);
    }

    /** Any assignment row of the visit, active or not. */
    static boolean everAssigned(ScheduledVisit visit, String callerUuid) {
        if (callerUuid == null || visit.getAssignments() == null) {
            return false;
        }
        for (ScheduledVisitAssignment a : visit.getAssignments()) {
            if (a != null && callerUuid.equals(a.getAssignedUser())) {
                return true;
            }
        }
        return false;
    }

    static boolean storable(ScheduledVisit visit) {
        return Boolean.TRUE.equals(visit.getIsActive()) && OPEN_STATUSES.contains(visit.getStatus());
    }

    /** The email's AMC details; the vendor name is added by the caller. */
    static Map<String, String> amcFields(ScheduledVisit visit, AmcConfiguration cfg, long reportedAt) {
        boolean known = cfg != null && cfg.getDurationMonths() != null && cfg.getVisitFrequencyMonths() != null && cfg.getVisitFrequencyMonths() != 0;
        Map<String, String> m = new LinkedHashMap<>();
        m.put("amc_number", visit.getVisitNumber() == null ? null : String.valueOf(visit.getVisitNumber()));
        m.put("total_amc", known ? String.valueOf(AmcSchedule.totalVisits(cfg.getDurationMonths(), cfg.getVisitFrequencyMonths())) : null);
        m.put("scheduled_amc_date", LivelihoodReportPdfData.format(visit.getScheduledDate(), LivelihoodReportPdfData.CLIENT_DAY));
        m.put("reported_date_time", LivelihoodReportPdfData.format(reportedAt, LivelihoodReportPdfData.CLIENT_DAY_TIME));
        return m;
    }

    /** {{key}} -> value, "-" when blank; {@code html} escapes the values and makes the result plain ASCII. */
    static String fill(String template, Map<String, String> fields, boolean html) {
        String out = template == null ? "" : template;
        for (Map.Entry<String, String> e : fields.entrySet()) {
            String value = e.getValue() == null || e.getValue().isBlank() ? "-" : e.getValue().trim();
            out = out.replace("{{" + e.getKey() + "}}", html ? HtmlUtils.htmlEscape(value, "UTF-8") : value);
        }
        return html ? asciiHtml(out) : out;
    }

    /** The mail service does not send HTML as UTF-8, so other characters arrive as "\uFFFD"; as codes they arrive intact. */
    private static String asciiHtml(String html) {
        StringBuilder b = new StringBuilder(html.length());
        html.codePoints().forEach(c -> {
            if (c < 128) {
                b.append((char) c);
            } else {
                b.append("&#").append(c).append(';');
            }
        });
        return b.toString();
    }
}
