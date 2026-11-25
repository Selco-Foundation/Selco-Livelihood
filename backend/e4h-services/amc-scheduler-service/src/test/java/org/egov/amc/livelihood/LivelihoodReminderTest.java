package org.egov.amc.livelihood;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.egov.amc.livelihood.LivelihoodReminder.Candidate;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LivelihoodReminderTest {

    static final String TEMPLATE = "Dear User, the annual maintenance (AMC) of your solar system is scheduled on {Date}. Please contact your vendor"
            + " on {Vendor number} to confirm the visit and for any details. Thank you. SELCO Foundation";

    @Test
    void windowIsTheWholeIstDayLeadDaysAhead() {
        long[] w = LivelihoodReminder.dueWindow(LocalDate.of(2026, 11, 16), 7);
        assertArrayEquals(new long[]{LivelihoodAmc.startOfIstDay(LocalDate.of(2026, 11, 23)), LivelihoodAmc.startOfIstDay(LocalDate.of(2026, 11, 24))}, w);
        assertEquals(LivelihoodAmc.startOfIstDay(LocalDate.of(2026, 11, 16)), LivelihoodReminder.dueWindow(LocalDate.of(2026, 11, 16), 0)[0]);
        assertEquals(LivelihoodAmc.startOfIstDay(LocalDate.of(2026, 11, 16)), LivelihoodReminder.dueWindow(LocalDate.of(2026, 11, 16), -3)[0]);
    }

    @Test
    void messageIsThePrdTextWithIstDateAndNumber() {
        long due = LivelihoodAmc.startOfIstDay(LocalDate.of(2027, 5, 14));
        assertEquals("Dear User, the annual maintenance (AMC) of your solar system is scheduled on 14/05/2027. Please contact your vendor on"
                + " 1000000917 to confirm the visit and for any details. Thank you. SELCO Foundation",
                LivelihoodReminder.message(TEMPLATE, "dd/MM/yyyy", due, "1000000917"));
        assertTrue(LivelihoodReminder.message(TEMPLATE, "dd/MM/yyyy", due + 23 * 3600_000L, "1").contains("14/05/2027"), "same IST day");
    }

    /** Records what the steps saw. claimed holds visit ids already reminded. */
    static class Fake implements LivelihoodReminder.Steps {
        final Set<String> claimed = new HashSet<>();
        final List<String> sent = new ArrayList<>();
        int lookups;

        public String endUserPhone(Candidate c) {
            return c.endUserPhone();
        }

        public Map<String, String> fieldStaffMobiles(Set<String> uuids) {
            lookups++;
            return Map.of("fs-1", "1000000917", "fs-2", "1000000918");
        }

        public boolean claim(Candidate c, long now) {
            return claimed.add(c.visitId());
        }

        public void send(Candidate c, String phone, String fieldStaffMobile, String message) {
            sent.add(c.visitId() + ":" + phone + ":" + fieldStaffMobile);
        }
    }

    @Test
    void oneSmsPerVisitAndMissingDataIsSkippedWithoutAClaim() {
        long due = LivelihoodAmc.startOfIstDay(LocalDate.of(2026, 11, 23));
        List<Candidate> cs = List.of(new Candidate("v1", due, "9000000001", "fs-1"), new Candidate("v2", due, "9000000002", "fs-2"),
                new Candidate("v3", due, null, "fs-1"), new Candidate("v4", due, "9000000004", "fs-gone"), new Candidate("v5", due, "9000000005", null));
        Fake f = new Fake();
        LivelihoodReminder.Result r = LivelihoodReminder.run(cs, TEMPLATE, "dd/MM/yyyy", 1L, f);
        assertEquals(new LivelihoodReminder.Result(5, 2, 0, 1, 2), r);
        assertEquals(List.of("v1:9000000001:1000000917", "v2:9000000002:1000000918"), f.sent);
        assertEquals(Set.of("v1", "v2"), f.claimed, "skipped rows are not marked as reminded");
        assertEquals(1, f.lookups, "one field staff lookup per run");

        LivelihoodReminder.Result again = LivelihoodReminder.run(cs.subList(0, 2), TEMPLATE, "dd/MM/yyyy", 2L, f);
        assertEquals(2, again.alreadySent());
        assertEquals(2, f.sent.size(), "a second run sends nothing");
    }

    @Test
    void reminderLeadDaysFromMdmsWithDefault() throws Exception {
        ObjectMapper m = new ObjectMapper();
        assertEquals(3, AmcMdmsOptions.parseConfigDays(m.readTree("{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"reminderLeadDays\":3}]}}}")).reminderLeadDays());
        assertEquals(7, AmcMdmsOptions.parseConfigDays(m.readTree("{\"MdmsRes\":{\"AMC\":{\"Config\":[{}]}}}")).reminderLeadDays());
        assertEquals(7, AmcMdmsOptions.parseConfigDays(m.readTree("{\"MdmsRes\":{\"AMC\":{\"Config\":[{\"reminderLeadDays\":-1}]}}}")).reminderLeadDays());
    }

    @Test
    void selectionAndClaimRules() {
        String s = ReminderService.CANDIDATES_SQL;
        assertTrue(s.contains("sv.status = 'SCHEDULED'") && s.contains("ac.status = 'ACTIVE'") && s.contains("sv.is_active"), "New visits of running AMCs");
        assertTrue(s.contains("sv.reminder_sent_at IS NULL") && s.contains("sv.scheduled_date >= ? AND sv.scheduled_date < ?"), "exact day, once");
        assertTrue(s.contains("ac.activity_facility_id IS NOT NULL"), "Livelihood AMCs only");
        assertTrue(ReminderService.CLAIM_SQL.contains("reminder_sent_at IS NULL"));
        assertTrue(ReminderService.RESEND_CLAIM_SQL.contains("reminder_sent_at IS NOT NULL") && ReminderService.RESEND_CLAIM_SQL.contains("scheduled_date >= ?"),
                "resend only an already-sent reminder that is not past due");
    }
}
