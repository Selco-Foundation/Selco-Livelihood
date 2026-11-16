package org.egov.amc.livelihood;

import org.egov.amc.livelihood.LivelihoodAmcCreateValidator.RowError;
import org.egov.amc.web.models.AmcConfiguration;
import org.egov.amc.web.models.AmcConfigurationAssignment;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import static org.egov.amc.livelihood.LivelihoodAmc.*;

/**
 * Edit AMC and turning AMC off for Livelihood (LLD §6.5), worked out as plain data so every rule is unit-tested.
 * Edit changes frequency, years and (until visit 1 is finally submitted) the start date; only the upcoming,
 * not-yet-submitted visit moves. Submitted visits never change. "Finally submitted" = code verified
 * (first_submission_date set), whatever the visit's later status.
 */
public final class LivelihoodAmcEditPlanner {

    private LivelihoodAmcEditPlanner() {
    }

    public static final String AMC_NOT_FOUND = "AMC_NOT_FOUND";
    public static final String AMC_COMPLETED = "AMC_COMPLETED";
    public static final String AMC_START_DATE_LOCKED = "AMC_START_DATE_LOCKED";
    public static final String AMC_TOTAL_BELOW_SUBMITTED = "AMC_TOTAL_BELOW_SUBMITTED";
    public static final String AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED = "AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED";

    /** Visit statuses removed when the AMC is turned off: unfinished work (New, code pending, rework). */
    public static final Set<String> REMOVED_ON_TURN_OFF = Set.of("SCHEDULED", "PENDING_OTP_APPROVAL", "REJECTED");

    /** A live visit of the AMC as the planner needs it. */
    public record VisitFact(String id, int number, String status, Long firstSubmissionDate, Long scheduledDate) {
        boolean done() {
            return isSet(firstSubmissionDate);
        }
    }

    /** What an edit does; the service applies it. */
    public record EditPlan(AmcConfiguration configuration, String redateVisitId, Long redateTo, String removeVisitId,
                           Integer createVisitNumber, Long createVisitDue, boolean completeNow) {
    }

    /**
     * @param stored      the configuration as loaded (null = not found or turned off)
     * @param visits      its live visits
     * @param approvedAt  installation approval (completed_at) for the start-date floor
     * @return errors (empty when the edit is valid)
     */
    public static List<RowError> check(int index, AmcConfiguration req, AmcConfiguration stored, List<VisitFact> visits,
                                       AmcMdmsOptions.Options options, long approvedAt) {
        List<RowError> errors = new ArrayList<>();
        String id = req.getId();
        if (stored == null || !Boolean.TRUE.equals(stored.getIsActive()) || STATUS_CANCELLED.equals(stored.getStatus())) {
            errors.add(new RowError(index, id, "id", AMC_NOT_FOUND, "no running AMC with this id"));
            return errors;
        }
        if (STATUS_COMPLETED.equals(stored.getStatus())) {
            errors.add(new RowError(index, id, "id", AMC_COMPLETED, "a completed AMC can't be changed; start a new AMC instead"));
            return errors;
        }
        Integer freq = req.getVisitFrequencyMonths();
        Integer dur = req.getDurationMonths();
        boolean freqOk = freq != null && options.frequencyMonths().contains(freq);
        if (!freqOk) {
            errors.add(new RowError(index, id, "visitFrequencyMonths", AMC_INVALID_FREQUENCY,
                    "frequency must be one of " + options.frequencyMonths() + " months"));
        }
        boolean durOk = dur != null && dur > 0 && dur % 12 == 0 && options.durationYears().contains(dur / 12);
        if (!durOk) {
            errors.add(new RowError(index, id, "durationMonths", AMC_INVALID_DURATION,
                    "duration must be one of " + options.durationYears() + " years, in months"));
        } else if (freqOk && dur % freq != 0) {
            errors.add(new RowError(index, id, "durationMonths", AMC_INVALID_DURATION,
                    "duration (" + dur + " months) is not a whole number of " + freq + "-month visits"));
        }

        String reqVendor = req.getVendorOrgId() != null ? req.getVendorOrgId() : req.getVendorId();
        if ((reqVendor != null && !reqVendor.equals(stored.getVendorId()))
                || (req.getAmcFieldStaffId() != null && !req.getAmcFieldStaffId().equals(activeFieldStaff(stored)))) {
            errors.add(new RowError(index, id, "vendorOrgId", AMC_ASSIGNMENT_CHANGE_NOT_ALLOWED,
                    "the vendor and field staff are changed with field-staff/_update"));
        }

        Long start = req.getConfigurationStartDate();
        if (isSet(start)) {
            if (STATUS_PENDING_ACTIVATION.equals(stored.getStatus())) {
                errors.add(new RowError(index, id, "configurationStartDate", AMC_START_DATE_NOT_ALLOWED,
                        "the start date is set when the installation is approved"));
            } else if (visits.stream().anyMatch(VisitFact::done)) {
                if (!Objects.equals(AmcSchedule.startOfDay(start), stored.getConfigurationStartDate())) {
                    errors.add(new RowError(index, id, "configurationStartDate", AMC_START_DATE_LOCKED,
                            "the start date can't change once visit 1 is submitted"));
                }
            } else if (isSet(approvedAt) && AmcSchedule.startOfDay(start) < AmcSchedule.startOfDay(approvedAt)) {
                errors.add(new RowError(index, id, "configurationStartDate", AMC_START_BEFORE_INSTALLATION,
                        "the start date can't be before the installation approval (" + istDay(approvedAt) + ")"));
            }
        }

        long done = visits.stream().filter(VisitFact::done).count();
        if (freqOk && durOk && dur % freq == 0 && dur / freq < done) {
            errors.add(new RowError(index, id, "durationMonths", AMC_TOTAL_BELOW_SUBMITTED,
                    done + " AMC visits are already done; choose years and frequency giving at least " + done));
        }
        return errors;
    }

    /** The edit, for a request that passed {@link #check}. Mutates and returns the stored configuration in the plan. */
    public static EditPlan plan(AmcConfiguration req, AmcConfiguration stored, List<VisitFact> visits) {
        int freq = req.getVisitFrequencyMonths();
        int dur = req.getDurationMonths();
        stored.setVisitFrequencyMonths(freq);
        stored.setDurationMonths(dur);
        if (!STATUS_ACTIVE.equals(stored.getStatus())) {
            return new EditPlan(stored, null, null, null, null, null, false);   // pending: dates come at activation
        }
        long start = isSet(req.getConfigurationStartDate()) && visits.stream().noneMatch(VisitFact::done)
                ? AmcSchedule.startOfDay(req.getConfigurationStartDate()) : stored.getConfigurationStartDate();
        stored.setConfigurationStartDate(start);
        stored.setConfigurationEndDate(AmcSchedule.plusMonths(start, dur));
        int total = AmcSchedule.totalVisits(dur, freq);

        List<VisitFact> done = visits.stream().filter(VisitFact::done).sorted(Comparator.comparingInt(VisitFact::number)).toList();
        VisitFact lastDone = done.isEmpty() ? null : done.get(done.size() - 1);
        long base = lastDone == null ? start : AmcSchedule.startOfDay(lastDone.firstSubmissionDate());
        long nextDue = AmcSchedule.plusMonths(base, freq);
        VisitFact upcoming = visits.stream().filter(v -> !v.done()).max(Comparator.comparingInt(VisitFact::number)).orElse(null);
        boolean allDoneApproved = done.stream().allMatch(v -> "APPROVED".equals(v.status()));

        if (upcoming != null) {
            if (upcoming.number() > total) {
                // fewer visits: the upcoming one goes; complete now if everything left is approved
                boolean complete = done.size() == total && allDoneApproved;
                return new EditPlan(stored, null, null, upcoming.id(), null, null, complete);
            }
            boolean moved = !Objects.equals(upcoming.scheduledDate(), nextDue);
            return new EditPlan(stored, moved ? upcoming.id() : null, moved ? nextDue : null, null, null, null, false);
        }
        int highest = visits.stream().mapToInt(VisitFact::number).max().orElse(0);
        if (total > highest && lastDone != null) {
            // more visits while none is upcoming: the next visit is created now (PRD 5.2.3)
            return new EditPlan(stored, null, null, null, highest + 1, nextDue, false);
        }
        boolean complete = done.size() == total && allDoneApproved;
        return new EditPlan(stored, null, null, null, null, null, complete);
    }

    /** Turning off: only a running AMC; errors otherwise. */
    public static List<RowError> checkTurnOff(int index, String id, AmcConfiguration stored) {
        List<RowError> errors = new ArrayList<>();
        if (stored == null || !Boolean.TRUE.equals(stored.getIsActive()) || STATUS_CANCELLED.equals(stored.getStatus())) {
            errors.add(new RowError(index, id, "id", AMC_NOT_FOUND, "no running AMC with this id"));
        } else if (STATUS_COMPLETED.equals(stored.getStatus())) {
            errors.add(new RowError(index, id, "id", AMC_COMPLETED, "a completed AMC can't be turned off"));
        }
        return errors;
    }

    /** Visits removed when the AMC is turned off; reports in review or approved stay. */
    public static List<String> visitsToRemoveOnTurnOff(List<VisitFact> visits) {
        return visits.stream().filter(v -> REMOVED_ON_TURN_OFF.contains(v.status())).map(VisitFact::id).toList();
    }

    public static String activeFieldStaff(AmcConfiguration cfg) {
        if (cfg.getAssignments() != null) {
            for (AmcConfigurationAssignment a : cfg.getAssignments()) {
                if (a.isActive()) {
                    return a.getAssignedUser();
                }
            }
        }
        return null;
    }
}
