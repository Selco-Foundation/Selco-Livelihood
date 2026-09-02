package org.egov.activity.util;

import org.egov.common.models.project.TaskStatus;

public class ActivityConstants {
    public static final String MASTER_TENANTS = "tenants";
    public static final String MDMS_TENANT_MODULE_NAME = "tenant";
    public static final String MDMS_COMMON_MASTERS_MODULE_NAME = "common-masters";
    public static final String MDMS_HCM_ATTENDANCE_MODULE_NAME = "HCM-ATTENDANCE";
    public static final String MASTER_STATE_INFO = "StateInfo";
    public static final String MASTER_ACTIVITIES = "Activities";
    public static final String BOM_FORM = "BOM_FORM";
    //location
    public static final String DRAFT_STATUS = "DRAFT";

    public static final String ACTIVE_STATUS = "ACTIVE";

    public static final String SCHEDULED_STATUS = "SCHEDULED";
    public static final String MASTER_ATTENDANCE_SESSION = "AttendanceSessions";
    public static final String CODE = "code";
    public static final String PROJECT_TYPE_FIELDPLAN = "FieldPlan";
    public static final String PROJECT_TYPE_FACILITY = "Facility";
    public static final String HIERARCHY_TYPE = "SELCO";
    public static final String TENANTID = "livelihood";
    //General
    public static final String SEMICOLON = ":";
    public static final String DOT = ".";
    public static final String PROJECT_PARENT_HIERARCHY_SEPERATOR = ".";
    public static final String TASK_NOT_ALLOWED = "TASK_NOT_ALLOWED";
    public static final String TASK_NOT_ALLOWED_BENEFICIARY_REFUSED_RESOURCE_EMPTY_ERROR_MESSAGE = "Task not allowed as resources can not be provided when " + TaskStatus.BENEFICIARY_REFUSED;
    public static final String TASK_NOT_ALLOWED_RESOURCE_CANNOT_EMPTY_ERROR_MESSAGE = "Task not allowed as resources can not be empty when ";
    public static final String NUMBER_OF_SESSIONS = "numberOfSessions";
    public static final String OR = " OR ";
    public static final String PROJECT_MANAGER = "PROJECT_MANAGER";
    public static final String FACILITY_ADMIN = "FACILITY_ADMIN";
    public static final String INSTALLATION_REPORT_APPROVER_QC_TEAM = "INSTALLATION_REPORT_APPROVER_QC_TEAM";
    public static final String INSTALLATION_REPORT_PART_A_EDITOR = "INSTALLATION_REPORT_PART_A_EDITOR";
    /** Pending-review status after Field Staff submit (Livelihood two-role model; replaces SUBMITTED_BY_SUPERVISOR). */
    public static final String SUBMITTED_BY_FIELD_STAFF = "SUBMITTED_BY_FIELD_STAFF";
    /** @deprecated Use {@link #SUBMITTED_BY_FIELD_STAFF}. Kept for any leftover references. */
    @Deprecated
    public static final String SUBMITTED_BY_SUPERVISOR = SUBMITTED_BY_FIELD_STAFF;

    public static final String ASSIGNED_TO_FIELD_STAFF = "ASSIGNED_TO_FIELD_STAFF";
    public static final String REJECTED_BY_QC_SPOC = "REJECTED_BY_QC_SPOC";
    public static final String APPROVED_BY_QC_SPOC = "APPROVED_BY_QC_SPOC";

    public static final String ACTION_SUBMIT_REPORT = "SUBMIT_REPORT";
    public static final String ACTION_APPROVE = "APPROVE";
    public static final String ACTION_REJECT_AND_ASSIGN_FOR_FIELD_QC = "REJECT_AND_ASSIGN_FOR_FIELD_QC";

    public static final String LOCK_STATUS_LOCKED = "LOCKED";
    public static final String LOCK_STATUS_UNLOCKED = "UNLOCKED";
}