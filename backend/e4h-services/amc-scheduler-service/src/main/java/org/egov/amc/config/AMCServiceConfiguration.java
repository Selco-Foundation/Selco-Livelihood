package org.egov.amc.config;

import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Component
public class AMCServiceConfiguration {

    @Value("${egov.product.host}")
    private String productHost;

    @Value("${egov.household.host}")
    private String householdServiceHost;

    @Value("${visit.management.transaction.kafka.create.topic}")
    private String transactionPersistTopic;

    @Value("${egov.project.host}")
    private String projectServiceHost;

    @Value("${egov.search.project.url}")
    private String projectServiceSearchUrl;

    @Value("${egov.staff.project.create.url}")
    private String projectStaffCreateUrl;

    @Value("${egov.asset.host}")
    private String assetServiceHost;

    @Value("${egov.asset.search.url}")
    private String assetServiceSearchUrl;

    @Value("${egov.otp.host}")
    private String otpServiceHost;

    @Value("${egov.otp.create.url}")
    private String otpServiceCreateUrl;

    @Value("${egov.otp.validate.url}")
    private String otpServiceValidateUrl;

    @Value("${egov.otp.default}")
    private String defaultOtp;

    @Value("${egov.otp.bypass.validation}")
    private boolean byPassOtpValidation;

    @Value("${egov.pdf.host}")
    private String pdfServiceHost;

    @Value("${egov.createandsave.pdf.url}")
    private String pdfServiceCreateUrl;

    @Value("${egov.facility.host}")
    private String facilityServiceHost;

    @Value("${egov.search.facility.url}")
    private String facilityServiceSearchUrl;

    @Value("${egov.v2.search.facility.url}")
    private String facilityServiceSearchUrlV2;

    @Value("${egov.v2.bulk.search.facility.url}")
    private String facilityBulkSearchUrl;

    /**
     * Index-only endpoint on facility-service for a facility's AMC snapshot. Deliberately not the
     * facility {@code _update} API: that would persist the AMC fields into the facility table's
     * additional_details, and AMC data is meant to exist on the search index only.
     */
    @Value("${egov.v2.facility.amc.index.update.url}")
    private String facilityAmcIndexUpdateUrl;

    @Value("${egov.field.planner.host:}")
    private String fieldPlannerHost;

    /**
     * Resolves a facility's system type, which field-planner owns - the value is captured on the
     * installation plan a facility is linked to. Published to the health facility index alongside the
     * AMC snapshot. Defaulted to blank so an environment that has not configured field-planner
     * degrades to indexing without a system type instead of failing to start.
     */
    @Value("${egov.field.planner.facility.system.type.search.url:}")
    private String fieldPlannerFacilitySystemTypeSearchUrl;

    @Value("${search.api.limit:100}")
    private String searchApiLimit;

    @Value("${egov.mdms.host}")
    private String mdmsHost;

    @Value("${egov.mdms.search.endpoint}")
    private String mdmsEndPoint;

    @Value("${project.document.id.verification.required}")
    private String documentIdVerificationRequired;

    @Value("${amc.configuration.create.topic}")
    private String saveAmcConfigurationTopic;

    @Value("${amc.configuration.update.topic}")
    private String updateAmcConfigurationTopic;

    @Value("${amc.configuration.delete.topic}")
    private String deleteAmcConfigurationTopic;

    @Value("${amc.plan.create.topic}")
    private String saveAmcPlanTopic;

    @Value("${amc.plan.update.topic}")
    private String updateAmcPlanTopic;

    @Value("${asset.amc.create.topic}")
    private String saveAssetAmcTopic;

    @Value("${asset.amc.update.topic}")
    private String updateAssetAmcTopic;

    @Value("${scheduled.visit.create.topic}")
    private String saveScheduledVisitTopic;

    @Value("${scheduled.visit.update.topic}")
    private String updateScheduledVisitTopic;

    @Value("${scheduled.visit.index.create.topic}")
    private String saveScheduledVisitIndexTopic;

    @Value("${scheduled.visit.index.update.topic}")
    private String updateScheduledVisitIndexTopic;

    @Value("${scheduled.visit.delete.topic}")
    private String deleteScheduledVisitTopic;

    @Value("${project.search.max.limit}")
    private Integer maxLimit;

    @Value("${project.default.offset}")
    private Integer defaultOffset;

    @Value("${project.default.limit}")
    private Integer defaultLimit;

    @Value("${egov.boundary.hierarchy.type}")
    private String boundaryHierarchyType;

    @Value("${egov.user.id.validator}")
    private String egovUserIdValidator;

    @Value("${egov.boundary.host}")
    private String boundaryServiceHost;

    @Value("${egov.boundary.search.url}")
    private String boundarySearchUrl;

    @Value("${egov.workflow.host}")
    private String wfHost;

    @Value("${egov.workflow.transition.path}")
    private String wfTransitionPath;

    @Value("${egov.workflow.search.path}")
    private String wfSearchPath;

    @Value("${egov.workflow.module.name}")
    private String moduleName;

    @Value("${egov.workflow.business.service}")
    private String businessService;

    @Value("${egov.hrms.host}")
    private String hrmsHost;

    @Value("${egov.hrms.search.url}")
    private String hrmsSearchUrl;

    /**
     * HRMS role code identifying an AMC field staff member. Used to pick which of a visit's assignees
     * becomes the mapped vendor on the search index. Configurable because role codes are MDMS data and
     * can differ per environment.
     */
    @Value("${amc.mapped.vendor.role.code}")
    private String mappedVendorRoleCode;

    @Value("${egov.vendor.host}")
    private String vendorHost;

    @Value("${egov.vendor.search.url}")
    private String vendorSearchUrl;

    @Value("${email.activity.assignment.subject}")
    private String activityEmailSubject;

    @Value("${email.activity.assignment.body}")
    private String activityEmailBody;

    @Value("${egov.kafka.notification.email.topic}")
    private String notificationEmailTopic;

    @Value("${email.activity.assignment.default.password}")
    private String defaultUserPassword;

    @Value("${notification.sms.enabled:false}")
    private Boolean smsEnabled;

    @Value("${kafka.topics.notification.sms:egov.core.notification.sms}")
    private String smsNotificationTopic;

    @Value("${amc.otp.sms.message.template:Your OTP for scheduled visit verification is {otp}.}")
    private String otpSmsTemplate;

    // Shared user-analytics topic -> user-analytics-report index (also produced by im-services SEM,
    // health-facility-registry and boundary-service).
    @Value("${amc.kafka.user.analytics.topic:user-analytics-event}")
    private String userAnalyticsTopic;

    @Value("${egov.localization.host:}")
    private String localizationHost;

    @Value("${egov.localization.context.path:}")
    private String localizationContextPath;

    @Value("${egov.localization.search.endpoint:}")
    private String localizationSearchEndpoint;

    public String getFacilityBulkSearchPath() {
        return facilityBulkSearchUrl;
    }

    // ---- Livelihood (LLD 07 §6.2). Defaults are the Livelihood values; E4H used "in" everywhere. ----

    /** State-level tenant for HRMS, vendor, boundary, localization and fallbacks. */
    @Value("${amc.state.tenant.id:livelihood}")
    private String stateTenantId;

    /** Localization module holding boundary names (E4H: rainmaker-in). */
    @Value("${amc.localization.boundary.module:rainmaker-livelihood}")
    private String boundaryLocalizationModule;

    /** Prefix of boundary name keys (E4H: Boundary_, Livelihood: BOUNDARY_). */
    @Value("${amc.localization.boundary.prefix:BOUNDARY_}")
    private String boundaryLocalizationPrefix;

    /** Roles that see every visit in search (E4H: PROJECT_MANAGER only, which hid reports from reviewers). */
    @Value("#{'${amc.search.see.all.roles:PROJECT_MANAGER,AMC_REVIEWER,SYSTEM_USER}'.split(',')}")
    private java.util.List<String> searchSeeAllRoles;

    /** E4H's per-facility AMC snapshot for Kibana; Livelihood's facility service has no endpoint for it. */
    @Value("${amc.facility.index.sync.enabled:false}")
    private boolean facilityIndexSyncEnabled;

    /** E4H's visit search-index push; Livelihood has no indexer config for these topics. */
    @Value("${amc.visit.index.push.enabled:false}")
    private boolean visitIndexPushEnabled;

    /** Livelihood schedule model: create per SOLAR installation row, activation on approval (LLD §6.3). */
    @Value("${amc.livelihood.schedule.enabled:true}")
    private boolean livelihoodScheduleEnabled;

    /** Installation service (field-planner-activity): SOLAR rows, approval status and date. */
    @Value("${egov.field.planner.activity.host:http://field-planner-activity.core:8080}")
    private String fieldPlannerActivityHost;

    @Value("${egov.field.planner.activity.search.url:/activity/v1/activities/_search}")
    private String fieldPlannerActivitySearchUrl;

    /** vendor-registry org-user search: membership and roles of the AMC field staff. */
    @Value("${egov.vendor.org.user.search.url:/vendor/organisation/v1/user/_search}")
    private String vendorOrgUserSearchUrl;

    /** egov-user search, to find the shared system account the service acts as (LLD §8.3). */
    @Value("${egov.user.host:http://egov-user.core:8080}")
    private String userHost;

    @Value("${egov.user.search.path:/user/_search}")
    private String userSearchPath;

    /** Username of the system account; the one holding SYSTEM_USER on the state tenant is used. */
    @Value("${amc.system.user.username:CRONJOB}")
    private String systemUserName;

    /** One persister message, one DB transaction: config ACTIVE + visit 1 + asset_amc (review A7). */
    @Value("${amc.livelihood.activate.topic:activate-amc-configuration}")
    private String activateAmcConfigurationTopic;

    /** One persister message: create on an already-approved installation (config + visit 1 + asset_amc). */
    @Value("${amc.livelihood.save.active.topic:save-active-amc-configuration}")
    private String saveActiveAmcConfigurationTopic;

    /** Lazy next visit after the first code verification (LLD §6.3). false = no visit n+1 is created. */
    @Value("${amc.livelihood.lazy.generation.enabled:true}")
    private boolean lazyGenerationEnabled;

    /** Non-functional system email to the Program POCs (LLD §6.7); {name} {phone} {state} {district} {block} are filled in. */
    @Value("${amc.non.functional.email.subject:AMC: system non-functional at {name}}")
    private String nonFunctionalEmailSubject;

    @Value("${amc.non.functional.email.body:End user: {name}\nPhone: {phone}\nState: {state}\nDistrict: {district}\nBlock: {block}\n\nSystem non-functional. Please raise a ticket.}")
    private String nonFunctionalEmailBody;

    /** Livelihood Edit AMC: only the upcoming visit moves (LLD §6.5). false = E4H update path. */
    @Value("${amc.livelihood.edit.upcoming.only:true}")
    private boolean editUpcomingOnly;

    /** Auto-approval against MDMS AMC.AutoApprovalRules at code verification (LLD §6.8). false = every report to a reviewer. */
    @Value("${amc.livelihood.auto.approval.enabled:true}")
    private boolean autoApprovalEnabled;

    /** Report PDF on every report step (LLD §6.10). false = steps skip the PDF (rollback switch). */
    @Value("${amc.pdf.enabled:true}")
    private boolean amcPdfEnabled;

    /** pdf-service key; Configs-Livelihood pdf-service/{data,format}-config/amc-report.json. */
    @Value("${amc.pdf.key:amc-report}")
    private String amcPdfKey;

    /** Daily reminder SMS job (LLD §6.8; cron amc.reminder.cron, 09:30 IST). false = the job does nothing. */
    @Value("${amc.livelihood.reminder.enabled:true}")
    private boolean reminderEnabled;

    /** PRD 7.4 wording; must match the DLT template exactly. {Date} and {Vendor number} are filled in. */
    @Value("${amc.reminder.sms.template:Dear User, the annual maintenance (AMC) of your solar system is scheduled on {Date}. Please contact your vendor on {Vendor number} to confirm the visit and for any details. Thank you. SELCO Foundation}")
    private String reminderSmsTemplate;

    @Value("${amc.reminder.date.format:dd/MM/yyyy}")
    private String reminderDateFormat;
}
