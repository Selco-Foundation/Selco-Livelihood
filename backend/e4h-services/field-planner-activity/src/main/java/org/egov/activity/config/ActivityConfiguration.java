package org.egov.activity.config;

import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Component
public class ActivityConfiguration {

    @Value("${fieldplan.facility.idgen.id.format}")
    private String fieldPlanFacilityIdFormat;

    /**
     * idgen id name for a bom row's IC Report number. The format itself is registered in
     * egov-idgen's own configuration, which lives outside this repository -- if it is missing,
     * vendor assignment fails at the Report Number step rather than dispatching numberless
     * reports.
     */
    @Value("${bom.report.number.idgen.name:bom.report.number}")
    private String bomReportNumberIdName;

    /**
     * Consumed by egov-persister's activity-persister.yml save-vendor-assignment mapping, which
     * writes facility_activities, bom, activity_facility_users and the field_plans handover in
     * one transaction. Keep the payload shape in sync with that mapping.
     */
    @Value("${vendor.assignment.kafka.create.topic:save-vendor-assignment}")
    private String saveVendorAssignmentTopic;

    /**
     * The plan's own workflow, distinct from egov.workflow.business.service
     * (FACILITY_INSTALLATION), which governs the individual assets. Vendor assignment's submit
     * transitions both: the plan on this service, each asset on that one.
     */
    @Value("${egov.workflow.installation.plan.business.service:INSTALLATION_PLAN}")
    private String installationPlanBusinessService;

    /**
     * The two plan statuses this service COMPARES against. It never writes them -- a written
     * status always comes from the workflow's transition response -- but "is this plan already
     * published?" and "is it still editable?" need a value to test, and a compiled-in literal is
     * what let field_plans.status and the workflow's state machine drift apart in the first place.
     *
     * Defaults match the INSTALLATION_PLAN business service as seeded: start state DRAFT, and
     * PUBLISH leading to the terminate state PUBLISHED. Change the workflow, change these.
     */
    @Value("${installation.plan.draft.status:DRAFT}")
    private String installationPlanDraftStatus;

    @Value("${installation.plan.published.status:PUBLISHED}")
    private String installationPlanPublishedStatus;

    @Value("${egov.fieldplan.host}")
    private String fieldPlanServiceHost;

    @Value("${egov.search.fieldplan.url}")
    private String fieldPlanServiceSearchUrl;

    @Value("${egov.search.fieldplan.facility.url}")
    private String fieldPlanFacilityServiceSearchUrl;

    @Value("${egov.facility.host}")
    private String facilityServiceHost;

    @Value("${egov.search.facility.url}")
    private String facilityServiceSearchUrl;

    @Value("${egov.facility.update.url}")
    private String facilityServiceUpdateUrl;

    @Value("${egov.v2.search.facility.url}")
    private String facilityServiceSearchUrlV2;

    @Value("${egov.pdf.host}")
    private String pdfServiceHost;

    // Ingestion service - merges the appendable BOM documents onto the end of the generated report.
    @Value("${egov.ingestion.host}")
    private String ingestionServiceHost;

    @Value("${egov.ingestion.document.append.url}")
    private String ingestionDocumentAppendUrl;

    @Value("${egov.ingestion.document.append.module}")
    private String ingestionDocumentAppendModule;

    // Localization - boundary codes rendered on the report are resolved to readable names.
    @Value("${egov.localization.host}")
    private String localizationHost;

    @Value("${egov.localization.context.path}")
    private String localizationContextPath;

    @Value("${egov.localization.search.endpoint}")
    private String localizationSearchEndpoint;

    @Value("${egov.createnosave.pdf.url}")
    private String pdfCreateNoSaveUrl;

    @Value("${egov.createandsave.pdf.url}")
    private String pdfCreateSaveFilestore;

    @Value("${egov.kafka.notification.email.topic}")
    private String notificationEmailTopic;

    @Value("${egov.kafka.notification.sms.topic:egov.core.notification.sms}")
    private String notificationSmsTopic;

    @Value("${egov.iccreport.erispinning.key}")
    private String iccreportEriSpinning;

    @Value("${egov.iccreport.lightmanufacturing.key}")
    private String iccreportLightManufacturing;

    @Value("${egov.iccreport.lsklaptop.key}")
    private String iccreportLskLaptop;

    @Value("${egov.iccreport.multistageprocessingmillet.key}")
    private String iccreportMultiStageProcessingMillet;

    @Value("${egov.iccreport.multistageprocessing.key}")
    private String iccreportMultiStageProcessing;

    @Value("${egov.iccreport.oilmill.key}")
    private String iccreportOilMill;

    @Value("${egov.iccreport.paddyintegratedprocessing.key}")
    private String iccreportPaddyIntegratedProcessing;

    @Value("${egov.iccreport.printer.key}")
    private String iccreportPrinter;

    @Value("${egov.iccreport.pulverizer.key}")
    private String iccreportPulverizer;

    @Value("${egov.iccreport.refrigerator.key}")
    private String iccreportRefrigerator;

    @Value("${egov.iccreport.ricehuller.key}")
    private String iccreportRiceHuller;

    @Value("${egov.iccreport.roaster.key}")
    private String iccreportRoaster;

    @Value("${egov.iccreport.sewingmachine.key}")
    private String iccreportSewingMachine;

    @Value("${egov.iccreport.textilelighting.key}")
    private String iccreportTextileLighting;

    @Value("${search.api.limit:100}")
    private String searchApiLimit;

    @Value("${global.tenant.id}")
    private String tenantId;

    @Value("${egov.mdms.host}")
    private String mdmsHost;
    @Value("${egov.mdms.search.endpoint}")
    private String mdmsEndPoint;

    // MDMS v2 schema search (e.g. Installation.Solution), distinct from the v1 common-masters
    // endpoint above (egov.mdms.search.endpoint).
    @Value("${egov.mdms.v2.search.endpoint:/egov-mdms-service/v2/_search}")
    private String mdmsSchemaSearchEndpoint;

    @Value("${project.document.id.verification.required}")
    private String documentIdVerificationRequired;

    @Value("${activity.assignment.kafka.create.topic}")
    private String createActivityAssignmentTopic;

    @Value("${activity.assignment.kafka.unassign.topic}")
    private String unassignActivityAssignmentTopic;

    @Value("${activity.facility.kafka.create.topic}")
    private String createActivityFacilityTopic;

    @Value("${activity.kafka.create.topic}")
    private String createActivityTopic;

    @Value("${activity.facility.kafka.update.topic}")
    private String updateActivityFacilityTopic;

    @Value("${activity.facility.kafka.delete.topic}")
    private String deleteActivityFacilityTopic;

    @Value("${activity.assignment.kafka.update.topic}")
    private String updateActivityAssignmentTopic;

    @Value("${bom.kafka.create.topic}")
    private String createBOMTopic;

    @Value("${bom.kafka.update.topic}")
    private String updateBOMTopic;

    @Value("${facility.user.kafka.create.topic}")
    private String createFacilityUserTopic;

    @Value("${facility.user.kafka.update.topic}")
    private String updateFacilityUserTopic;

    @Value("${project.search.max.limit}")
    private Integer maxLimit;

    @Value("${project.default.offset}")
    private Integer defaultOffset;

    @Value("${project.default.limit}")
    private Integer defaultLimit;

    @Value("${project.mdms.module}")
    private String mdmsModule;

    @Value("${task.mdms.module}")
    private String taskMdmsModule;

    @Value("${egov.location.hierarchy.type}")
    private String locationHierarchyType;

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

    @Value("${egov.vendor.user.host}")
    private String orgUserHost;

    @Value("${egov.vendor.user.search.url}")
    private String orgUserSearchUrl;

    @Value("${egov.vendor.user.update.url}")
    private String orgUserUpdateUrl;

    @Value("${facility.management.transaction.kafka.create.topic}")
    private String transactionPersistTopic;

    @Value("${facility.management.comment.kafka.create.topic}")
    private String commentPersistTopic;

    @Value("${egov.asset.host}")
    private String assetHost;

    @Value("${egov.asset.search.url}")
    private String assetSearchUrl;

    @Value("${egov.asset.update.url}")
    private String assetUpdateUrl;

    /**
     * Explicit page size for the asset search behind the installation report's serial-number
     * section: asset-registry defaults limit to 10, which would silently truncate the panel /
     * battery / inverter serial numbers on any sizeable installation. Defaulted inline so
     * environments that predate this property still start.
     */
    @Value("${egov.asset.search.limit:1000}")
    private Integer assetSearchLimit;

    @Value("${email.activity.assignment.subject}")
    private String activityEmailSubject;

    @Value("${email.activity.assignment.body}")
    private String activityEmailBody;

    @Value("${email.ic.report.submitted.subject}")
    private String icReportSubmittedSubject;

    @Value("${email.ic.report.submitted.body}")
    private String icReportSubmittedBody;

    @Value("${email.ic.report.rejected.subject}")
    private String icReportRejectedSubject;

    @Value("${email.ic.report.rejected.body}")
    private String icReportRejectedBody;

    @Value("${sms.ic.report.rejected.body}")
    private String icReportRejectedSmsBody;

    @Value("${egov.fieldplan.facility.update.lock.url}")
    private String fieldPlanFacilityUpdateLockUrl;

    @Value("${egov.amc.scheduler.host}")
    private String amcSchedulerHost;

    @Value("${egov.amc.scheduler.asset.create.url}")
    private String amcAssetCreateUrl;

    @Value("${egov.amc.scheduler.configuration.search.url}")
    private String amcConfigurationSearchUrl;

    @Value("${egov.amc.scheduler.visit.generate.url}")
    private String amcVisitGenerateUrl;

    @Value("${egov.otp.host}")
    private String otpServiceHost;

    @Value("${egov.otp.create.url}")
    private String otpServiceCreateUrl;

    @Value("${egov.otp.validate.url}")
    private String otpServiceValidateUrl;

    @Value("${activity.facility.otp.sms.message.template:Your OTP for facility verification is {otp}.}")
    private String otpSmsTemplate;
}
