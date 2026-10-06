package org.egov.util;

public class OrganisationConstant {

    //Modules
    public static final String MDMS_TENANT_MODULE_NAME = "tenant";
    public static final String MDMS_COMMON_MASTERS_MODULE_NAME = "common-masters";
    public static final String MDMS_ORGANIZATION_MODULE_NAME = "Organisation";

    //Masters
    public static final String MASTER_TENANTS = "tenants";
//    public static final String MASTER_ORG_TYPE = "OrgType";
    public static final String MASTER_ORG_TYPE = "OrgType";
    public static final String MASTER_ORG_SUB_TYPE = "OrgSubType";
    public static final String MASTER_ORG_STATUS = "OrgStatus";
    public static final String MASTER_ORG_ROLES = "OrgRoles";
    public static final String MASTER_ORG_FUNC_CLASS = "OrgFunctionClass";
    public static final String MASTER_ORG_TAX_IDENTIFIER = "OrgTaxIdentifier";

    //Role
    public static final String ORG_ADMIN_ROLE_CODE = "ORG_ADMIN";
    public static final String ORG_ADMIN_ROLE_NAME = "Organization admin";
    public static final String ORG_CITIZEN_TYPE = "CITIZEN";
    public static final String VENDOR_ADMIN_ROLE_CODE = "VENDOR_ADMIN";
    public static final String VENDOR_ADMIN_ROLE_NAME = "Vendor admin";
    public static final String EMPLOYEE_ROLE_CODE = "EMPLOYEE";
    public static final String EMPLOYEE_ROLE_NAME = "Employee";

    // Organisation types whose POC is auto-provisioned as an HRMS employee on creation
    public static final String ORG_TYPE_PLATFORM = "PLATFORM";
    public static final String ORG_TYPE_VENDOR = "VENDOR";

    // localization contants
    public static final String ORGANISATION_CREATE_LOCALIZATION_CODE="ORGANISATION_NOTIFICATION_ON_CREATE";
    public static final String ORGANISATION_UPDATE_LOCALIZATION_CODE="ORGANISATION_NOTIFICATION_ON_UPDATE";

    public static final String ORGANISATION_NOTIFICATION_ENG_LOCALE_CODE = "en_IN";

    public static final String ORGANISATION_MODULE_CODE = "rainmaker-common-masters";

    public static final String ORGANISATION_LOCALIZATION_CODES_JSONPATH = "$.messages.*.code";
    public static final String ORGANISATION_LOCALIZATION_MSGS_JSONPATH = "$.messages.*.message";

    //HRMS User Constants
    public static final String HRMS_USER_USERNAME_CODE = "$.Employees.*.user.userName";

    public static final String HRMS_USER_MOBILE_NO = "$.Employees.*.user.mobileNumber";

    public static final String ORGANISATION_ENCRYPT_KEY = "Organization";


}
