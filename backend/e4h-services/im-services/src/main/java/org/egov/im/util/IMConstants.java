package org.egov.im.util;

import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
@NoArgsConstructor
public class IMConstants {


    public static final String IM_BUSINESSSERVICE = "Incident";

    public static final String LIVELIHOOD_BUSINESSSERVICE = "LivelihoodIncident";

    public static final String LIVELIHOOD_TENANT_ID = "livelihood";

    public static final String LIVELIHOOD_WF_AUTO_ASSIGN = "AUTO_ASSIGN";

    public static final String LIVELIHOOD_WF_CREATE = "CREATE";

    public static final String LIVELIHOOD_PENDING_FOR_RESOLUTION = "PENDING_FOR_RESOLUTION";

    public static final String LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC = "OUT_OF_SCOPE_PENDING_POC";

    public static final String LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR = "OUT_OF_SCOPE_PENDING_VENDOR";

    public static final String LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR = "OUT_OF_WARRANTY_PENDING_VENDOR";

    public static final String LIVELIHOOD_RESOLVED = "RESOLVED";

    public static final String LIVELIHOOD_CLOSED_AFTER_RESOLUTION = "CLOSED_AFTER_RESOLUTION";

    public static final String LIVELIHOOD_CLOSED_AFTER_DECLINE = "CLOSED_AFTER_DECLINE";

    public static final String LIVELIHOOD_WF_OUT_OF_SCOPE = "OUT_OF_SCOPE";

    public static final String LIVELIHOOD_WF_OUT_OF_WARRANTY = "OUT_OF_WARRANTY";

    public static final String LIVELIHOOD_WF_DECLINE = "DECLINE";

    public static final String LIVELIHOOD_WF_AUTO_CLOSE = "AUTO_CLOSE";

    /** 72-hour reopen window after resolution. */
    public static final long LIVELIHOOD_REOPEN_WINDOW_MS = 72L * 60 * 60 * 1000;

    public static final String REOPEN_ACCESS_DENIED_CODE = "REOPEN_ACCESS_DENIED";

    public static final String REOPEN_ACCESS_DENIED_MSG =
            "Only the facility manager can reopen this ticket";

    public static final String REOPEN_WINDOW_EXPIRED_CODE = "403";

    public static final String REOPEN_WINDOW_EXPIRED_MSG =
            "Reopen is only allowed within 72 hours of resolution";

    public static final String REOPEN_VENDOR_NOT_FOUND_CODE = "REOPEN_VENDOR_NOT_FOUND";

    public static final String REOPEN_VENDOR_NOT_FOUND_MSG =
            "Could not determine the vendor to reassign for reopen";

    public static final String VENDOR_ACCESS_DENIED_CODE = "VENDOR_ACCESS_DENIED";

    public static final String VENDOR_ACCESS_DENIED_MSG = "Access denied: ticket is not assigned to you";

    public static final String LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY = "oowQuotation";

    public static final String LIVELIHOOD_OOW_ENTERED_AT_DETAIL_KEY = "oowEnteredAt";

    public static final String ROLE_LIVELIHOOD_VENDOR = "LIVELIHOOD_VENDOR";

    public static final String ROLE_LIVELIHOOD_POC = "LIVELIHOOD_POC";

    public static final String POC_ACCESS_DENIED_CODE = "POC_ACCESS_DENIED";

    public static final String POC_ACCESS_DENIED_MSG =
            "Access denied: resource is outside your assigned state jurisdiction";

    public static final String POC_JURISDICTION_MISSING_CODE = "POC_JURISDICTION_MISSING";

    public static final String POC_JURISDICTION_MISSING_MSG =
            "LIVELIHOOD_POC user has no active state jurisdiction configured in HRMS";

    public static final String ENTRY_CHANNEL_DIRECT = "DIRECT";

    public static final String ENTRY_CHANNEL_POC_MANUAL = "POC_MANUAL";

    public static final String ENTRY_CHANNEL_IVR_WHATSAPP = "IVR_WHATSAPP";

    public static final String MDMS_SERVICEDEF_LIVELIHOOD_SEARCH =
            "$.MdmsRes.Incident.ServiceDefs[?(@.serviceCode=='{SERVICEDEF}' && @.menuPath=='{MENUPATH}')]";

    public static final String MDMS_LIVELIHOOD_MODULE = "livelihood";

    public static final String MDMS_ITEM_CODE_MASTER = "ItemCode";

    public static final String LIVELIHOOD_CATCH_ALL_MENU_PATH = "I Cannot Identify The Issue";

    public static final String LIVELIHOOD_ASSET_CATEGORY_DETAIL_KEY = "assetCategory";

    public static final String LIVELIHOOD_RAISED_BY_POC_DETAIL_KEY = "raisedByPocUuid";

    public static final String COMPLAINANT_NOT_FOUND_CODE = "COMPLAINANT_NOT_FOUND";

    public static final String COMPLAINANT_NOT_FOUND_MSG =
            "No facility manager (COMPLAINANT) found for the facility boundary";

    public static final String IM_BUSINESSSERVICE_HIGH = "Incident_High";

    public static final String IM_BUSINESSSERVICE_MEDIUM = "Incident_Medium";

    public static final String IM_BUSINESSSERVICE_LOW = "Incident_Low";

    public static final String USERTYPE_EMPLOYEE = "EMPLOYEE";

    public static final String USERTYPE_CITIZEN = "CITIZEN";

    public static final String IM_MODULENAME = "im-services";

    public static final String IM_WF_REOPEN = "REOPEN";
    
    public static final String IM_MODULE = "rainmaker-im";

    public static final String MDMS_SERVICEDEF = "ServiceDefs";

    public static final String MDMS_MODULE_NAME = "Incident";

    public static final String MDMS_SERVICEDEF_SEARCH = "$.MdmsRes.Incident.ServiceDefs[?(@.serviceCode=='{SERVICEDEF}')]";

    public static final String MDMS_DEPARTMENT_SEARCH = "$.MdmsRes.RAINMAKER-im.ServiceDefs[?(@.serviceCode=='{SERVICEDEF}')].department";

    public static final String HRMS_DEPARTMENT_JSONPATH = "$.Employees.*.assignments.*.department";

    public static final String HRMS_DESIGNATION_JSONPATH = "$.Employees.*.assignments[?(@.department=='{department}')].designation";

    public static final String HRMS_EMP_NAME_JSONPATH = "$.Employees.*.user.name";

    public static final String HRMS_EMP_USERNAME_JSONPATH = "$.Employees.*.user.userName";
    
    public static final String HRMS_EMP_MOBILE_JSONPATH = "$.Employees.*.user.mobileNumber";
    
    public static final String HRMS_EMP_UUID_JSONPATH = "$.Employees.*.user.uuid";

    public static final String PENDING_FOR_REASSIGNMENT = "PENDINGFORREASSIGNMENT";

    public static final String APPLY_PENDING_FOR_REASSIGNMENT = "APPLY_PENDINGFORASSIGNMENT";

    public static final String RESOLVE_RESOLVED = "RESOLVE_RESOLVED";

    public static final String REOPEN_PENDING_FOR_ASSIGNMENT = "REOPEN_PENDINGFORASSIGNMENT";

    public static final String REASSIGN_PENDINGATLME = "REASSIGN_PENDINGATLME";

    public static final String REJECT_REJECTED = "REJECT_REJECTED";

    public static final String PENDINGATVENDOR = "PENDINGRESOLUTION";
	
    public static final String CLOSE = "CLOSE";

    public static final String REASSIGN = "REASSIGN";

    public static final String REJECT = "REJECT";

    public static final String REJECTED = "REJECTED";

    public static final String PENDINGFORASSIGNMENT = "PENDINGFORASSIGNMENT";

    public static final String PENDINGFORASSIGNMENT_THEFT = "PENDINGFORASSIGNMENT_THEFT";

    public static final String PENDINGFORASSIGNMENT_RMS_DEVICE = "PENDINGFORASSIGNMENT_RMS_DEVICE";

    public static final String RMS_DEVICE_PENDING_TECH_POC = "RMS_DEVICE_PENDING_TECH_POC";

    public static final String RMS_DEVICE_PENDINGRESOLUTION = "RMS_DEVICE_PENDINGRESOLUTION";

    /** Ticket types that sync to facility_rms_inactive_incident (create/re-open = insert, resolve/decline/close = delete). */
    public static final String TICKET_TYPE_RMS = "RMS Device";
    public static final String TICKET_TYPE_THEFT = "Theft";

    public static final String OUT_OF_SCOPE = "OUT_OF_SCOPE";

    public static final String OUT_OF_WARRANTY_PENDING_TECH_POC = "OUT_OF_WARRANTY_PENDING_TECH_POC";

    public static final String PENDING_REVISION = "PENDING_REVISION";

    public static final String OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2 = "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2";

    public static final String PENDING_ASSIGNMENT_OUT_OF_WARRANTY = "PENDING_ASSIGNMENT_OUT_OF_WARRANTY";

    public static final String PENDING_RESOLUTION_OUT_OF_SCOPE = "PENDING_RESOLUTION_OUT_OF_SCOPE";

    public static final String RESOLVED = "RESOLVED";

    public static final String CLOSED_AFTER_RESOLUTION = "CLOSEDAFTERRESOLUTION";

    public static final String CLOSED_AFTER_REJECTION = "CLOSEDAFTERREJECTION";

    public static final String RATE = "RATE";

    public static final String APPLY = "APPLY";

    public static final String APPLY_RMS_DEVICE = "APPLY_RMS_DEVICE";

    public static final String APPLY_THEFT = "APPLY_THEFT";

    public static final String CITIZEN = "CITIZEN";

    public static final String EMPLOYEE = "EMPLOYEE";
    
    public static final String CRM = "CRM";

    public static final String COMMENT = "COMMENT";

    public static final String COMMENT_DEFAULT = "COMMENT_DEFAULT";

    public static final String DEFAULT = "DEFAULT";

    public static final String ASSIGN_CITIZEN_PENDINGATLME = "ASSIGN_CITIZEN_PENDINGATLME";

    public static final String ASSIGN_EMPLOYEE_PENDINGATLME = "ASSIGN_EMPLOYEE_PENDINGATLME";

    public static final String CLOSE_EMPLOYEE_CLOSED_AFTER_RESOLUTION = "CLOSE_CLOSEDAFTERRESOLUTION";

    public static final String REASSIGN_CITIZEN_PENDINGATLME = "REASSIGN_CITIZEN_PENDINGATLME";

    public static final String REASSIGN_EMPLOYEE_PENDINGATLME = "REASSIGN_EMPLOYEE_PENDINGATLME";

    public static final String REJECT_CITIZEN_REJECTED = "REJECT_CITIZEN_REJECTED";

    public static final String REOPEN_CITIZEN_PENDINGFORASSIGNMENT = "REOPEN_CITIZEN_PENDINGFORASSIGNMENT";

    public static final String REOPEN_EMPLOYEE_PENDINGFORASSIGNMENT = "REOPEN_EMPLOYEE_PENDINGFORASSIGNMENT";

    public static final String RESOLVE_CITIZEN_RESOLVED = "RESOLVE_CITIZEN_RESOLVED";

    public static final String APPLY_PENDINGFORASSIGNMENT = "APPLY_PENDINGFORASSIGNMENT";

    public static final String APPLY_RMS_DEVICE_PENDINGFORASSIGNMENT_RMS_DEVICE =
            "APPLY_RMS_DEVICE_PENDINGFORASSIGNMENT_RMS_DEVICE";

    public static final String APPLY_THEFT_PENDINGFORASSIGNMENT_THEFT =
            "APPLY_THEFT_PENDINGFORASSIGNMENT_THEFT";

    public static final String REASSIGN_PENDING_FOR_REASSIGNMENT = "REASSIGN_PENDINGFORREASSIGNMENT";

    public static final String ASSIGN = "ASSIGN";
    public static final String SENDBACK = "SENDBACK";

    public static final String ASSIGN_PENDING_AT_LME = "ASSIGN_PENDINGATLME";
    
    public static final String SENDBACK_PENDINGFORASSIGNMENT="SENDBACK_PENDINGFORASSIGNMENT";
    
    public static final String ASSIGN_PENDINGRESOLUTION = "ASSIGN_PENDINGRESOLUTION";
    public static final String RATE_CLOSED_AFTER_REJECTION = "RATE_CLOSEDAFTERREJECTION";

    public static final String RATE_CLOSED_AFTER_RESOLUTION = "RATE_CLOSEDAFTERRESOLUTION";

    public static final List<String> NOTIFICATION_ENABLE_FOR_STATUS = Collections
            .unmodifiableList(Arrays.asList(SENDBACK_PENDINGFORASSIGNMENT,ASSIGN_PENDINGRESOLUTION,APPLY_PENDING_FOR_REASSIGNMENT,RESOLVE_RESOLVED,REOPEN_PENDING_FOR_ASSIGNMENT,REASSIGN_PENDINGATLME,
                    REJECT_REJECTED,ASSIGN_CITIZEN_PENDINGATLME,ASSIGN_EMPLOYEE_PENDINGATLME,CLOSE_EMPLOYEE_CLOSED_AFTER_RESOLUTION,
                    REASSIGN_CITIZEN_PENDINGATLME,REASSIGN_EMPLOYEE_PENDINGATLME,REJECT_CITIZEN_REJECTED,REOPEN_CITIZEN_PENDINGFORASSIGNMENT,
                    REOPEN_EMPLOYEE_PENDINGFORASSIGNMENT,RESOLVE_CITIZEN_RESOLVED,APPLY_PENDINGFORASSIGNMENT,
                    APPLY_RMS_DEVICE_PENDINGFORASSIGNMENT_RMS_DEVICE, APPLY_THEFT_PENDINGFORASSIGNMENT_THEFT,
                    COMMENT, COMMENT_DEFAULT, DEFAULT,
                    REASSIGN_PENDING_FOR_REASSIGNMENT, ASSIGN_PENDING_AT_LME, RATE_CLOSED_AFTER_REJECTION, RATE_CLOSED_AFTER_RESOLUTION));

    public static final String NOTIFICATION_LOCALE = "en_IN";


    public static final String COMMON_MODULE = "rainmaker-common";

    public static final String DATE_PATTERN = "dd/MM/yyyy";

    public static final String IM_WF_RESOLVE = "RESOLVE";
    
    public static final String IM_WF_SENDBACK = "SENDBACK";

    public static final String USREVENTS_EVENT_TYPE = "SYSTEMGENERATED";

    public static final String USREVENTS_EVENT_NAME = "im";

    public static final String USREVENTS_EVENT_POSTEDBY = "SYSTEM-im";

    public static final String IMAGE_DOCUMENT_TYPE = "PHOTO";

    public static final String MDMS_DATA_JSONPATH = "$.MdmsRes.RAINMAKER-im.ServiceDefs";

    public static final String MDMS_DATA_SERVICE_CODE_KEYWORD = "serviceCode";

    public static final String MDMS_DATA_SLA_KEYWORD = "slaHours";

    public static final String COMPLAINTS_RESOLVED = "complaintsResolved";

    public static final String AVERAGE_RESOLUTION_TIME = "averageResolutionTime";

    public static final String TENANTID_MDC_STRING = "TENANTID";

    public static String SCHEMA_REPLACE_STRING = "{schema}";

    public static final String DESIGNATION = "designation";

    public static final String DEPARTMENT = "department";


    public static final String PENDING_ASSIGNMENT_PREFIX = "PENDING_ASSIGNMENT_";

    public static final String PENDING_RESOLUTION_PREFIX = "PENDING_RESOLUTION_";

    public static final String ROLE_COMPLAINANT = "COMPLAINANT";
    public static final String ROLE_COMPLAINT_ASSESSOR = "COMPLAINT_ASSESSOR";
    public static final String ROLE_COMPLAINT_RESOLVER = "COMPLAINT_RESOLVER";
    public static final String ROLE_COMPLAINT_FACILITATOR_1 = "COMPLAINT_FACILITATOR_1";
    public static final String ROLE_COMPLAINT_FACILITATOR_2 = "COMPLAINT_FACILITATOR_2";

    public static final String PENDING_RESOLUTION_OUT_OF_WARRANTY = "PENDING_RESOLUTION_OUT_OF_WARRANTY";

    public static final String OUT_OF_WARRANTY_ACTION = "OUT_OF_WARRANTY";
    public static final String MARK_OUT_OF_SCOPE_ACTION = "MARK_OUT_OF_SCOPE";
    public static final String REVISE_ACTION = "REVISE";
    public static final String SUBMIT_ACTION = "SUBMIT";
    public static final String APPROVE_ACTION = "APPROVE";

    public static final String ASIA_KOLKATA = "Asia/Kolkata";

    public static final String PENDINGFORASSIGNMENT_PREFIX = "PENDINGFORASSIGNMENT_";
}
