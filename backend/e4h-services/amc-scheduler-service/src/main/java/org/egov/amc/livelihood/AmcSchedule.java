package org.egov.amc.livelihood;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

import static org.egov.amc.livelihood.LivelihoodAmc.istDay;
import static org.egov.amc.livelihood.LivelihoodAmc.startOfIstDay;

/**
 * Schedule maths and fixed ids (LLD 07 §6.3). Dates are whole IST days: a start is 00:00 IST of its day,
 * and adding months keeps the day of the month, falling back to the month's last day when it is shorter
 * (31 Jan + 1 month = 28/29 Feb).
 */
public final class AmcSchedule {

    private AmcSchedule() {
    }

    /** 00:00 IST of the day the instant falls on (an approval at 16:30 starts the AMC at 00:00 that day). */
    public static long startOfDay(long epochMillis) {
        return startOfIstDay(istDay(epochMillis));
    }

    /** dayStart + months, as 00:00 IST, month-end clamped. */
    public static long plusMonths(long dayStartMillis, int months) {
        LocalDate day = istDay(dayStartMillis).plusMonths(months);
        return startOfIstDay(day);
    }

    /** Visits in the AMC: years x 12 / frequency (PRD). */
    public static int totalVisits(int durationMonths, int frequencyMonths) {
        return frequencyMonths <= 0 ? 0 : durationMonths / frequencyMonths;
    }

    /** The same visit always gets the same id, whoever creates it and however often (repeat-safe). */
    public static String visitId(String configId, int visitNumber) {
        return nameUuid("amc-visit|" + configId + "|" + visitNumber);
    }

    public static String assetAmcId(String configId, String assetId) {
        return nameUuid("asset-amc|" + configId + "|" + assetId);
    }

    public static String visitAssignmentId(String visitId, String userId) {
        return nameUuid("amc-visit-assignment|" + visitId + "|" + userId);
    }

    private static String nameUuid(String name) {
        return UUID.nameUUIDFromBytes(name.getBytes(StandardCharsets.UTF_8)).toString();
    }
}
