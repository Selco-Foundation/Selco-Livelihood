package org.egov.amc.livelihood;

import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.ScheduledVisit;
import org.egov.amc.web.models.ScheduledVisitAssignment;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.egov.amc.livelihood.LivelihoodAmc.isSet;
import static org.egov.amc.livelihood.LivelihoodAmc.istDay;
import static org.egov.amc.livelihood.LivelihoodAmc.startOfIstDay;

/**
 * Fields computed at read time for Livelihood visit search (LLD §6.8, §6.9), in IST calendar days.
 * SLA (PENDING_APPROVAL only): due = latest submission day + reviewSlaDays; breached from that day on;
 * days remaining = due - today (0 on the due day, then negative). Submitted 10 March with 7 days: due 17 March,
 * not breached on the 16th, breached on the 17th.
 */
public final class VisitReadFields {

    private VisitReadFields() {
    }

    public record Sla(long dueDate, boolean breached, int daysRemaining) {
    }

    /** null when the visit is not waiting for review or has no latest submission. */
    public static Sla sla(String status, Long latestSubmission, int reviewSlaDays, long now) {
        if (!"PENDING_APPROVAL".equals(status) || !isSet(latestSubmission)) {
            return null;
        }
        LocalDate due = istDay(latestSubmission).plusDays(reviewSlaDays);
        LocalDate today = istDay(now);
        int remaining = (int) ChronoUnit.DAYS.between(today, due);
        return new Sla(startOfIstDay(due), !today.isBefore(due), remaining);
    }

    /** Filter cutoff: a pending report submitted before 00:00 IST of (today - reviewSlaDays + 1) is breached. */
    public static long slaCutoff(int reviewSlaDays, long now) {
        return startOfIstDay(istDay(now).minusDays(reviewSlaDays - 1L));
    }

    /** "+91 96783 35201" / "096783 35201" -> "9678335201"; null when the text isn't a 10-digit phone. */
    public static String normalisePhone(String text) {
        if (text == null) {
            return null;
        }
        String digits = text.replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+91")) {
            digits = digits.substring(3);
        } else if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        } else if (digits.startsWith("0") && digits.length() == 11) {
            digits = digits.substring(1);
        }
        return digits.matches("[6-9]\\d{9}") ? digits : null;
    }

    public static Integer totalVisits(AmcConfiguration cfg) {
        if (cfg == null || cfg.getDurationMonths() == null || cfg.getVisitFrequencyMonths() == null || cfg.getVisitFrequencyMonths() <= 0) {
            return null;
        }
        return AmcSchedule.totalVisits(cfg.getDurationMonths(), cfg.getVisitFrequencyMonths());
    }

    public static Long submissionWindowOpensAt(Long scheduledDate, int windowDays) {
        return isSet(scheduledDate) ? startOfIstDay(istDay(scheduledDate).minusDays(windowDays)) : null;
    }

    /** The active assignee as {uuid, name, mobile}; name and mobile from the HRMS user the search already attached. */
    public static Map<String, Object> fieldStaff(ScheduledVisit visit) {
        if (visit.getAssignments() == null) {
            return null;
        }
        for (ScheduledVisitAssignment a : visit.getAssignments()) {
            if (a != null && a.isActive()) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("uuid", a.getAssignedUser());
                m.put("name", a.getUser() != null ? a.getUser().getName() : null);
                m.put("mobile", a.getUser() != null ? a.getUser().getMobileNumber() : null);
                return m;
            }
        }
        return null;
    }

    /** Fills the computed fields on one visit (vendor name and boundary names are filled by the caller in batch). */
    public static void fill(ScheduledVisit v, LivelihoodVisitDays days, long now) {
        AmcConfiguration cfg = v.getAmcConfiguration();
        Sla s = sla(v.getStatus(), v.getLatestSubmissionDate(), days.reviewSlaDays(), now);
        v.setSlaDueDate(s == null ? null : s.dueDate());
        v.setSlaBreached(s == null ? null : s.breached());
        v.setSlaDaysRemaining(s == null ? null : s.daysRemaining());
        v.setTotalVisits(totalVisits(cfg));
        v.setSubmissionWindowOpensAt(submissionWindowOpensAt(v.getScheduledDate(), days.submissionWindowDays()));
        v.setActivityFacilityId(cfg != null ? cfg.getActivityFacilityId() : null);
        v.setFieldStaff(fieldStaff(v));
    }

    public record LivelihoodVisitDays(int reviewSlaDays, int submissionWindowDays) {
    }
}
