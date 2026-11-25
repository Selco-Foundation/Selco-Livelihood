package org.egov.amc.livelihood;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/** Constants and date helpers of the Livelihood AMC layer (LLD 07). */
public final class LivelihoodAmc {

    private LivelihoodAmc() {
    }

    /** All AMC dates are whole IST calendar days (LLD §6.3). */
    public static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    // Configuration statuses
    public static final String STATUS_PENDING_ACTIVATION = "PENDING_ACTIVATION";
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    // Installation service
    public static final String COMPONENT_SOLAR = "SOLAR";
    public static final String INSTALLATION_APPROVED = "APPROVED_BY_QC_SPOC";

    // vendor-registry
    public static final String ORG_TYPE_VENDOR = "VENDOR";
    public static final String ROLE_AMC_FIELD_STAFF = "AMC_FIELD_STAFF";

    // Error codes (LLD §8.7)
    public static final String AMC_INVALID_ACTIVITY_FACILITY = "AMC_INVALID_ACTIVITY_FACILITY";
    public static final String AMC_INVALID_VENDOR_ORG = "AMC_INVALID_VENDOR_ORG";
    public static final String AMC_FIELD_STAFF_NOT_IN_ORG = "AMC_FIELD_STAFF_NOT_IN_ORG";
    public static final String AMC_FIELD_STAFF_ROLE_MISSING = "AMC_FIELD_STAFF_ROLE_MISSING";
    public static final String AMC_INVALID_FREQUENCY = "AMC_INVALID_FREQUENCY";
    public static final String AMC_INVALID_DURATION = "AMC_INVALID_DURATION";
    public static final String AMC_START_DATE_NOT_ALLOWED = "AMC_START_DATE_NOT_ALLOWED";
    public static final String AMC_START_DATE_REQUIRED = "AMC_START_DATE_REQUIRED";
    public static final String AMC_START_BEFORE_INSTALLATION = "AMC_START_BEFORE_INSTALLATION";
    public static final String AMC_INSTALLATION_APPROVAL_DATE_MISSING = "AMC_INSTALLATION_APPROVAL_DATE_MISSING";
    public static final String DUPLICATE_AMC_CONFIGURATION = "DUPLICATE_AMC_CONFIGURATION";
    public static final String AMC_INVALID_TENANT = "AMC_INVALID_TENANT";
    public static final String AMC_SOLAR_ASSET_NOT_FOUND = "AMC_SOLAR_ASSET_NOT_FOUND";

    /** The IST calendar day of an epoch-millis instant. */
    public static LocalDate istDay(long epochMillis) {
        return Instant.ofEpochMilli(epochMillis).atZone(IST).toLocalDate();
    }

    /** 00:00 IST of the given day, as epoch millis. */
    public static long startOfIstDay(LocalDate day) {
        return day.atStartOfDay(IST).toInstant().toEpochMilli();
    }

    public static boolean isSet(Long epochMillis) {
        return epochMillis != null && epochMillis > 0;
    }
}
