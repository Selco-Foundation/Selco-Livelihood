package org.egov.amc.livelihood;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Reminder SMS rules (LLD §6.8), kept free of I/O so they are unit-tested. One reminder per New visit
 * ({@code SCHEDULED}, of an {@code ACTIVE} AMC), sent on the exact day due − {@code reminderLeadDays} (IST), to the
 * end user's phone, with the assigned field staff's mobile as {@code {Vendor number}}. A row is claimed through
 * {@code reminder_sent_at} before sending, so two runs or two replicas never both send.
 */
public final class LivelihoodReminder {

    private LivelihoodReminder() {
    }

    /** A visit due on the reminder day, as read by the selection query. */
    public record Candidate(String visitId, long scheduledDate, String endUserPhone, String fieldStaffUuid) {
    }

    /** What one run did. */
    public record Result(int candidates, int sent, int alreadySent, int noEndUserPhone, int noFieldStaffMobile) {
    }

    public interface Steps {
        /** Plain end-user phone (the stored value may be encrypted); null when there is none. */
        String endUserPhone(Candidate c);

        /** Field staff mobiles by user uuid, one lookup for the whole run. */
        Map<String, String> fieldStaffMobiles(Set<String> uuids);

        /** Synchronous claim; false when another run already sent this reminder. */
        boolean claim(Candidate c, long now);

        void send(Candidate c, String phone, String fieldStaffMobile, String message);
    }

    /** [00:00 IST of today + lead, 00:00 IST of the day after): visits due on the reminder day. */
    public static long[] dueWindow(LocalDate todayIst, int leadDays) {
        LocalDate due = todayIst.plusDays(Math.max(leadDays, 0));
        return new long[]{LivelihoodAmc.startOfIstDay(due), LivelihoodAmc.startOfIstDay(due.plusDays(1))};
    }

    /** The PRD 7.4 text with {Date} (IST day of the due date) and {Vendor number}. */
    public static String message(String template, String dateFormat, long scheduledDate, String fieldStaffMobile) {
        String date = LivelihoodAmc.istDay(scheduledDate).format(DateTimeFormatter.ofPattern(dateFormat));
        return template.replace("{Date}", date).replace("{Vendor number}", fieldStaffMobile == null ? "" : fieldStaffMobile);
    }

    /**
     * Missing data is checked before the claim, so a skipped row is not marked as reminded. An end user with no
     * phone or a field staff with no mobile is logged and skipped (LLD §6.8: not expected).
     */
    public static Result run(List<Candidate> candidates, String template, String dateFormat, long now, Steps steps) {
        Set<String> uuids = new LinkedHashSet<>();
        candidates.stream().map(Candidate::fieldStaffUuid).filter(Objects::nonNull).forEach(uuids::add);
        Map<String, String> mobiles = uuids.isEmpty() ? Map.of() : steps.fieldStaffMobiles(uuids);
        int sent = 0;
        int already = 0;
        int noPhone = 0;
        int noMobile = 0;
        for (Candidate c : candidates) {
            String mobile = c.fieldStaffUuid() == null ? null : mobiles.get(c.fieldStaffUuid());
            if (isBlank(mobile)) {
                noMobile++;
                continue;
            }
            String phone = steps.endUserPhone(c);
            if (isBlank(phone)) {
                noPhone++;
                continue;
            }
            if (!steps.claim(c, now)) {
                already++;
                continue;
            }
            steps.send(c, phone, mobile, message(template, dateFormat, c.scheduledDate(), mobile));
            sent++;
        }
        return new Result(candidates.size(), sent, already, noPhone, noMobile);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
