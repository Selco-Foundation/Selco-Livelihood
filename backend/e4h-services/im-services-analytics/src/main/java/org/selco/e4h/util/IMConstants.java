package org.selco.e4h.util;

/**
 * Constants used throughout the incident management analytics module.
 * Contains module names, master data keys, and status identifiers for SLA computation.
 */
public class IMConstants {

    private IMConstants() {}

    /**
     * Exact module name for common masters data.
     */
    public static final String MODULE_NAME_COMMON_MASTERS = "common-masters";

    /**
     * Exact master data key for business hours configuration.
     */
    public static final String BUSINESS_HOUR_MASTER = "BusinessHours";

    /**
     * Exact identifier for incidents.
     */
    public static final String INCIDENT = "Incident";

    /**
     * Exact identifier for service definitions.
     */
    public static final String SERVICE_DEF = "ServiceDefs";

    /**
     * Prefix used for statuses related to pending assignments.
     * Used to match any state starting with this prefix.
     */
    public static final String PENDING_ASSIGNMENT_PREFIX = "PENDING_ASSIGNMENT_";

    /**
     * Prefix used for statuses related to pending resolutions.
     * Used to match any state starting with this prefix.
     */
    public static final String PENDING_RESOLUTION_PREFIX = "PENDING_RESOLUTION_";

    /**
     * Exact status indicating pending assignment.
     */
    public static final String PENDING_FOR_ASSIGNMENT = "PENDINGFORASSIGNMENT";

    /**
     * Exact status indicating pending resolution.
     */
    public static final String PENDING_RESOLUTION = "PENDINGRESOLUTION";

    /**
     * Exact status indicating pending assignment for theft incidents.
     */
    public static final String PENDINGFORASSIGNMENT_THEFT = "PENDINGFORASSIGNMENT_THEFT";

    /**
     * Exact status indicating pending assignment for RMS device incidents.
     */
    public static final String PENDINGFORASSIGNMENT_RMS_DEVICE = "PENDINGFORASSIGNMENT_RMS_DEVICE";

    /**
     * Exact status indicating RMS device is pending technical POC.
     */
    public static final String RMS_DEVICE_PENDING_TECH_POC = "RMS_DEVICE_PENDING_TECH_POC";

    /**
     * Exact status indicating RMS device is pending resolution.
     */
    public static final String RMS_DEVICE_PENDINGRESOLUTION = "RMS_DEVICE_PENDINGRESOLUTION";

    /**
     * Exact status indicating incident is out of scope.
     */
    public static final String OUT_OF_SCOPE = "OUT_OF_SCOPE";

    /**
     * Exact status indicating out-of-warranty case pending tech POC (round 1).
     */
    public static final String OUT_OF_WARRANTY_PENDING_TECH_POC = "OUT_OF_WARRANTY_PENDING_TECH_POC";

    /**
     * Exact status indicating revision is pending for out-of-warranty cases.
     */
    public static final String PENDING_REVISION = "PENDING_REVISION";

    /**
     * Exact status indicating out-of-warranty case pending tech POC (round 2).
     */
    public static final String OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2 = "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2";

    /**
     * Exact status indicating pending assignment for out-of-warranty cases.
     */
    public static final String PENDING_ASSIGNMENT_OUT_OF_WARRANTY = "PENDING_ASSIGNMENT_OUT_OF_WARRANTY";

    /**
     * Exact status indicating pending resolution for out-of-warranty cases.
     */
    public static final String PENDING_RESOLUTION_OUT_OF_WARRANTY = "PENDING_RESOLUTION_OUT_OF_WARRANTY";

    /**
     * Exact status indicating pending resolution for out-of-scope cases.
     */
    public static final String PENDING_RESOLUTION_OUT_OF_SCOPE = "PENDING_RESOLUTION_OUT_OF_SCOPE";

    /**
     * Exact status indicating pending resolution when spare part is needed.
     */
    public static final String PENDING_RESOLUTION_SPARE_PART_NEEDED = "PENDING_RESOLUTION_SPARE_PART_NEEDED";

    /**
     * Exact key representing business service.
     */
    public static final String BUSINESS_SERVICE = "businessService";

    public static final String REJECTED = "REJECTED";

    public static final String RESOLVED = "RESOLVED";

    public static final String CLOSED_AFTER_RESOLUTION = "CLOSEDAFTERRESOLUTION";

    public static final String CLOSED_AFTER_REJECTION = "CLOSEDAFTERREJECTION";

    public static final String INCIDENT_UNDERSCORE = "Incident_";

    public static final String LIVELIHOOD_INCIDENT = "LivelihoodIncident";

    public static final String LIVELIHOOD_PENDING_FOR_RESOLUTION = "PENDING_FOR_RESOLUTION";

    public static final String LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC = "OUT_OF_SCOPE_PENDING_POC";

    public static final String LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR = "OUT_OF_SCOPE_PENDING_VENDOR";

    public static final String LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR = "OUT_OF_WARRANTY_PENDING_VENDOR";

    public static final String LIVELIHOOD_CLOSED_AFTER_RESOLUTION = "CLOSED_AFTER_RESOLUTION";

    public static final String LIVELIHOOD_CLOSED_AFTER_DECLINE = "CLOSED_AFTER_DECLINE";

    public static final String LIVELIHOOD_TENANT_ID = "livelihood";

    public static final String ROLE_LIVELIHOOD_POC = "LIVELIHOOD_POC";

    public static final String LIVELIHOOD_APP_NAME = "Setu 4 Livelihoods";

    public static final String LIVELIHOOD_URL_SMS_MESSAGE = "LIVELIHOOD_URL_SMS_MESSAGE";

    public static final String LIVELIHOOD_DATE_PATTERN = "dd-MM-yyyy";

    public static final String LIVELIHOOD_EMAIL_SUBJECT_SUFFIX = "-SUBJECT";

    public static final String LIV_SUM_D_001 = "LIV-SUM-D-001";
    public static final String LIV_SUM_D_002 = "LIV-SUM-D-002";
    public static final String LIV_SUM_D_003 = "LIV-SUM-D-003";
    public static final String LIV_SUM_D_004 = "LIV-SUM-D-004";
    public static final String LIV_SUM_D_005 = "LIV-SUM-D-005";
    public static final String LIV_SUM_D_006 = "LIV-SUM-D-006";
    public static final String LIV_SUM_D_007 = "LIV-SUM-D-007";
    public static final String LIV_SUM_D_008 = "LIV-SUM-D-008";
    public static final String LIV_SUM_D_009 = "LIV-SUM-D-009";
    public static final String LIV_SUM_D_010 = "LIV-SUM-D-010";
    public static final String LIV_SUM_D_011 = "LIV-SUM-D-011";
    public static final String LIV_SUM_D_012 = "LIV-SUM-D-012";

    public static final String LIV_SUM_W_001 = "LIV-SUM-W-001";
    public static final String LIV_SUM_W_002 = "LIV-SUM-W-002";
    public static final String LIV_SUM_W_003 = "LIV-SUM-W-003";
    public static final String LIV_SUM_W_004 = "LIV-SUM-W-004";
    public static final String LIV_SUM_W_005 = "LIV-SUM-W-005";
    public static final String LIV_SUM_W_006 = "LIV-SUM-W-006";
    public static final String LIV_SUM_W_007 = "LIV-SUM-W-007";
    public static final String LIV_SUM_W_008 = "LIV-SUM-W-008";
    public static final String LIV_SUM_W_009 = "LIV-SUM-W-009";
    public static final String LIV_SUM_W_010 = "LIV-SUM-W-010";
    public static final String LIV_SUM_W_011 = "LIV-SUM-W-011";
    public static final String LIV_SUM_W_012 = "LIV-SUM-W-012";
}