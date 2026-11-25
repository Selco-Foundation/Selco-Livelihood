package org.egov.amc.livelihood;

import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.livelihood.LivelihoodAmcEditPlanner.EditPlan;
import org.egov.amc.livelihood.LivelihoodAmcEditPlanner.VisitFact;
import org.egov.amc.web.models.AmcConfiguration;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.egov.amc.livelihood.AmcScheduleAndPlanTest.day;
import static org.egov.amc.livelihood.AmcScheduleAndPlanTest.ist;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** LLD §6.5 examples: start 1 Jan 2027, 6 months, 1 year -> total 2, visit 1 due 1 Jul 2027. */
class LivelihoodAmcEditPlannerTest {

    static final AmcMdmsOptions.Options OPTIONS = new AmcMdmsOptions.Options(Set.of(6, 12), Set.of(1, 2, 3));
    static final long START = day(2027, 1, 1);

    static AmcConfiguration stored() {
        AmcConfiguration c = AmcScheduleAndPlanTest.pendingConfig();
        c.setStatus("ACTIVE");
        c.setConfigurationStartDate(START);
        c.setConfigurationEndDate(day(2028, 1, 1));
        return c;
    }

    static AmcConfiguration edit(Integer freq, Integer dur) {
        return AmcConfiguration.builder().id("cfg-1").tenantId("livelihood").visitFrequencyMonths(freq).durationMonths(dur).build();
    }

    static VisitFact v(int n, String status, Long first, long due) {
        return new VisitFact("v" + n, n, status, first, due);
    }

    static List<String> codes(List<RowError> errors) {
        return errors.stream().map(RowError::code).toList();
    }

    // ---- the five LLD examples ----------------------------------------------------------------------

    @Test
    void example1FrequencySixToTwelveNothingSubmittedMovesVisitOne() {
        List<VisitFact> visits = List.of(v(1, "SCHEDULED", null, day(2027, 7, 1)));
        assertTrue(LivelihoodAmcEditPlanner.check(0, edit(12, 12), stored(), visits, OPTIONS, START).isEmpty());
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(12, 12), stored(), visits);
        assertEquals("v1", p.redateVisitId());
        assertEquals(day(2028, 1, 1), p.redateTo());
        assertEquals(day(2028, 1, 1), p.configuration().getConfigurationEndDate());
        assertNull(p.removeVisitId());
        assertNull(p.createVisitNumber());
    }

    @Test
    void example2YearsOneToTwoKeepsTheUpcomingVisit() {
        long first1 = ist(2027, 7, 10, 11, 0);
        List<VisitFact> visits = List.of(v(1, "APPROVED", first1, day(2027, 7, 1)), v(2, "SCHEDULED", null, day(2028, 1, 10)));
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(6, 24), stored(), visits);
        assertNull(p.redateVisitId(), "visit 2 unchanged (10 Jan 2028)");
        assertEquals(day(2029, 1, 1), p.configuration().getConfigurationEndDate());
        assertFalse(p.completeNow());
    }

    @Test
    void example3FrequencySixToTwelveAfterVisitOneRemovesVisitTwo() {
        long first1 = ist(2027, 7, 10, 11, 0);
        List<VisitFact> approved = List.of(v(1, "APPROVED", first1, day(2027, 7, 1)), v(2, "SCHEDULED", null, day(2028, 1, 10)));
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(12, 12), stored(), approved);
        assertEquals("v2", p.removeVisitId());
        assertTrue(p.completeNow(), "visit 1 approved -> COMPLETED now");

        List<VisitFact> inReview = List.of(v(1, "PENDING_APPROVAL", first1, day(2027, 7, 1)), v(2, "SCHEDULED", null, day(2028, 1, 10)));
        EditPlan q = LivelihoodAmcEditPlanner.plan(edit(12, 12), stored(), inReview);
        assertEquals("v2", q.removeVisitId());
        assertFalse(q.completeNow(), "completes on visit 1's approval instead");
    }

    @Test
    void example4YearsUpWhileTheLastVisitIsInReviewCreatesVisitThreeNow() {
        List<VisitFact> visits = List.of(v(1, "APPROVED", ist(2027, 7, 10, 11, 0), day(2027, 7, 1)),
                v(2, "PENDING_APPROVAL", ist(2028, 1, 5, 9, 0), day(2028, 1, 10)));
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(6, 24), stored(), visits);
        assertEquals(3, p.createVisitNumber());
        assertEquals(day(2028, 7, 5), p.createVisitDue());
    }

    @Test
    void example5TotalBelowDoneVisitsIsRejected() {
        List<VisitFact> visits = List.of(v(1, "APPROVED", ist(2027, 7, 10, 11, 0), day(2027, 7, 1)),
                v(2, "PENDING_APPROVAL", ist(2028, 1, 5, 9, 0), day(2028, 1, 10)));
        assertEquals(List.of("AMC_TOTAL_BELOW_SUBMITTED"),
                codes(LivelihoodAmcEditPlanner.check(0, edit(12, 12), stored(), visits, OPTIONS, START)));
    }

    // ---- more plan cases ----------------------------------------------------------------------------

    @Test
    void codePendingVisitKeepsItsReportOnlyTheDateMoves() {
        List<VisitFact> visits = List.of(v(1, "PENDING_OTP_APPROVAL", null, day(2027, 7, 1)));
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(12, 12), stored(), visits);
        assertEquals("v1", p.redateVisitId());
        assertNull(p.removeVisitId());
    }

    @Test
    void newStartDateMovesEverythingBeforeAnySubmission() {
        AmcConfiguration req = edit(6, 12);
        req.setConfigurationStartDate(ist(2027, 3, 15, 18, 0));
        EditPlan p = LivelihoodAmcEditPlanner.plan(req, stored(), List.of(v(1, "SCHEDULED", null, day(2027, 7, 1))));
        assertEquals(day(2027, 3, 15), p.configuration().getConfigurationStartDate(), "00:00 IST of the day");
        assertEquals(day(2028, 3, 15), p.configuration().getConfigurationEndDate());
        assertEquals(day(2027, 9, 15), p.redateTo());
    }

    @Test
    void unchangedDueDateMeansNoRedate() {
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(6, 24), stored(), List.of(v(1, "SCHEDULED", null, day(2027, 7, 1))));
        assertNull(p.redateVisitId());
    }

    @Test
    void pendingAmcOnlyChangesFrequencyAndYears() {
        AmcConfiguration pending = AmcScheduleAndPlanTest.pendingConfig();
        EditPlan p = LivelihoodAmcEditPlanner.plan(edit(12, 24), pending, List.of());
        assertEquals(12, p.configuration().getVisitFrequencyMonths());
        assertEquals(24, p.configuration().getDurationMonths());
        assertNull(p.configuration().getConfigurationStartDate());
        assertNull(p.redateVisitId());
    }

    // ---- checks -------------------------------------------------------------------------------------

    @Test
    void notRunningOrCompleted() {
        assertEquals(List.of("AMC_NOT_FOUND"), codes(LivelihoodAmcEditPlanner.check(0, edit(6, 12), null, List.of(), OPTIONS, 0)));
        AmcConfiguration cancelled = stored();
        cancelled.setIsActive(false);
        cancelled.setStatus("CANCELLED");
        assertEquals(List.of("AMC_NOT_FOUND"), codes(LivelihoodAmcEditPlanner.check(0, edit(6, 12), cancelled, List.of(), OPTIONS, 0)));
        AmcConfiguration completed = stored();
        completed.setStatus("COMPLETED");
        assertEquals(List.of("AMC_COMPLETED"), codes(LivelihoodAmcEditPlanner.check(0, edit(6, 24), completed, List.of(), OPTIONS, 0)));
        assertEquals(List.of("AMC_COMPLETED"), codes(LivelihoodAmcEditPlanner.checkTurnOff(0, "cfg-1", completed)));
        assertEquals(List.of("AMC_NOT_FOUND"), codes(LivelihoodAmcEditPlanner.checkTurnOff(0, "x", null)));
        assertTrue(LivelihoodAmcEditPlanner.checkTurnOff(0, "cfg-1", stored()).isEmpty());
    }

    @Test
    void frequencyAndYearsMustBeOptionsAndDivide() {
        assertEquals(List.of("AMC_INVALID_FREQUENCY"), codes(LivelihoodAmcEditPlanner.check(0, edit(3, 12), stored(), List.of(), OPTIONS, 0)));
        assertEquals(List.of("AMC_INVALID_DURATION"), codes(LivelihoodAmcEditPlanner.check(0, edit(6, 48), stored(), List.of(), OPTIONS, 0)));
        assertEquals(List.of("AMC_INVALID_FREQUENCY", "AMC_INVALID_DURATION"),
                codes(LivelihoodAmcEditPlanner.check(0, edit(null, null), stored(), List.of(), OPTIONS, 0)), "can't be blanked");
    }

    @Test
    void startDateRules() {
        AmcConfiguration req = edit(6, 12);
        req.setConfigurationStartDate(day(2027, 2, 1));
        AmcConfiguration pending = AmcScheduleAndPlanTest.pendingConfig();
        assertEquals(List.of("AMC_START_DATE_NOT_ALLOWED"), codes(LivelihoodAmcEditPlanner.check(0, req, pending, List.of(), OPTIONS, 0)));

        List<VisitFact> verified = List.of(v(1, "PENDING_APPROVAL", ist(2027, 6, 20, 10, 0), day(2027, 7, 1)), v(2, "SCHEDULED", null, day(2027, 12, 20)));
        assertEquals(List.of("AMC_START_DATE_LOCKED"), codes(LivelihoodAmcEditPlanner.check(0, req, stored(), verified, OPTIONS, 0)));
        AmcConfiguration same = edit(6, 12);
        same.setConfigurationStartDate(START);
        assertTrue(LivelihoodAmcEditPlanner.check(0, same, stored(), verified, OPTIONS, 0).isEmpty(), "same value is fine");

        AmcConfiguration early = edit(6, 12);
        early.setConfigurationStartDate(day(2026, 12, 1));
        assertEquals(List.of("AMC_START_BEFORE_INSTALLATION"),
                codes(LivelihoodAmcEditPlanner.check(0, early, stored(), List.of(v(1, "SCHEDULED", null, day(2027, 7, 1))), OPTIONS, ist(2026, 12, 20, 15, 0))));
    }

    @Test
    void vendorAndFieldStaffChangeElsewhere() {
        AmcConfiguration req = edit(6, 12);
        req.setVendorOrgId("org-2");
        assertEquals(List.of("AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED"), codes(LivelihoodAmcEditPlanner.check(0, req, stored(), List.of(), OPTIONS, 0)));
        AmcConfiguration staff = edit(6, 12);
        staff.setAmcFieldStaffId("fs-9");
        assertEquals(List.of("AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED"), codes(LivelihoodAmcEditPlanner.check(0, staff, stored(), List.of(), OPTIONS, 0)));
        AmcConfiguration sameStaff = edit(6, 12);
        sameStaff.setAmcFieldStaffId("fs-1");
        sameStaff.setVendorOrgId("org-1");
        assertTrue(LivelihoodAmcEditPlanner.check(0, sameStaff, stored(), List.of(), OPTIONS, 0).isEmpty());
    }

    // ---- turning off --------------------------------------------------------------------------------

    @Test
    void turnOffRemovesUnfinishedWorkOnly() {
        List<VisitFact> visits = List.of(v(1, "APPROVED", 1L, 1), v(2, "PENDING_APPROVAL", 2L, 2), v(3, "REJECTED", 3L, 3),
                v(4, "PENDING_OTP_APPROVAL", null, 4), v(5, "SCHEDULED", null, 5));
        assertEquals(List.of("v3", "v4", "v5"), LivelihoodAmcEditPlanner.visitsToRemoveOnTurnOff(visits));
    }
}
