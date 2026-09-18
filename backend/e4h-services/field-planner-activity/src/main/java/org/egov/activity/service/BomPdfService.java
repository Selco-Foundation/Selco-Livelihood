package org.egov.activity.service;

import com.fasterxml.jackson.core.type.TypeReference;
import lombok.extern.slf4j.Slf4j;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.activity.repository.ActivityAssignmentRepository;
import org.egov.activity.util.BoundaryLocalizationUtil;
import org.egov.activity.util.MDMSUtils;
import org.egov.activity.util.VendorDirectory;
import org.egov.activity.web.models.*;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

import static org.egov.activity.util.ActivityConstants.ACTION_APPROVE;
import static org.egov.activity.util.ActivityConstants.ACTION_SUBMIT_REPORT;
import static org.egov.activity.util.ActivityConstants.ACTION_SUBMIT_REPORT_A;
import static org.egov.activity.util.ActivityConstants.ACTION_SUBMIT_REPORT_B;
import static org.egov.activity.util.ActivityConstants.INSTALLATION_IMAGE_DOCUMENT_TYPE_PREFIX;

/**
 * Builds the BOM installation-report PDF data for an activity facility and generates+saves it via
 * pdf-service, returning the resulting fileStoreId. The pdf-service template ("key") is chosen by
 * {@link BomService#generateAndSaveBOMPdfToFilestore} itself, based on the systemType carried on
 * the request - this class is only responsible for resolving the BOM data and the systemType.
 */
@Service
@Slf4j
public class BomPdfService {

    private static final String SYSTEM_TYPE_KEY = "systemType";
    private static final DateTimeFormatter PROJECT_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter REPORT_TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    private static final String COMPONENT_TYPE_MACHINE = "MACHINE";
    private static final String VERIFICATION_STATUS_DEFAULT = "Success";

    private static final String DOCUMENTS_KEY = "documents";
    private static final String DOCUMENT_TYPE_KEY = "documentType";
    private static final String FILE_STORE_ID_KEY = "fileStoreId";

    /**
     * Non-image document types carried through to {@link BomService#generateAndSaveBOMPdfToFilestore},
     * which appends them as extra pages at the end of the generated report. Must stay spelled exactly
     * as BomService.APPENDABLE_DOCUMENT_TYPES, which matches on documentType with equals().
     */
    private static final List<String> APPENDABLE_DOCUMENT_TYPES = List.of(
            "ASSET_HANDOVER_DOCUMENT", "INSTALLATION_COMPLETION_CERTIFICATE"
    );

    private static final String SR_NO_KEY = "srNo";
    private static final String SERIAL_NUMBER_KEY = "serialNumber";

    /**
     * assetTypeID (as stored by asset-registry) -> the bomData key its serial numbers render under.
     * Every key is always emitted, empty when the facility has no asset of that type, so the report
     * template never has to guard against a missing field.
     */
    private static final Map<String, String> SERIAL_NUMBER_KEY_BY_ASSET_TYPE = Map.of(
            "PANEL", "panel_serial_number",
            "BATTERY", "battery_serial_number",
            "INVERTER", "inverter_serial_number"
    );

    private final BomService bomService;
    private final BoundaryLocalizationUtil boundaryLocalizationUtil;
    private final ServiceRequestRepository serviceRequest;
    private final ActivityConfiguration activityConfiguration;
    private final FacilityWorkflowService facilityWorkflowService;
    private final ActivityAssignmentRepository activityAssignmentRepository;
    private final MDMSUtils mdmsUtils;
    private final VendorDirectory vendorDirectory;

    public BomPdfService(BomService bomService, BoundaryLocalizationUtil boundaryLocalizationUtil,
                         ServiceRequestRepository serviceRequest, ActivityConfiguration activityConfiguration,
                         FacilityWorkflowService facilityWorkflowService,
                         ActivityAssignmentRepository activityAssignmentRepository, MDMSUtils mdmsUtils,
                         VendorDirectory vendorDirectory) {
        this.bomService = bomService;
        this.boundaryLocalizationUtil = boundaryLocalizationUtil;
        this.serviceRequest = serviceRequest;
        this.activityConfiguration = activityConfiguration;
        this.facilityWorkflowService = facilityWorkflowService;
        this.activityAssignmentRepository = activityAssignmentRepository;
        this.mdmsUtils = mdmsUtils;
        this.vendorDirectory = vendorDirectory;
    }

    /**
     * Generates the BOM installation-report PDF via pdf-service and returns the resulting
     * fileStoreId.
     *
     * @param workflowDocuments documents carried on the incoming workflow. The installation images
     *                          among them are rendered inside the report and the appendable ones are
     *                          merged onto its end, both by
     *                          {@link BomService#generateAndSaveBOMPdfToFilestore}; may be null.
     */
    public String generateInstallationReportPdf(RequestInfo requestInfo, ActivityFacility activityFacility,
                                                List<Document> workflowDocuments) {
        log.trace("Entering generateInstallationReportPdf method for activityFacilityId: {}", activityFacility.getId());

        if (isMachineComponent(activityFacility)) {
            return generateMachineInstallationReportPdf(requestInfo, activityFacility);
        }

        String tenantId = activityFacility.getTenantId();

//        String systemType = resolveSystemType(activityFacility);
        String solutionId = activityFacility.getSolutionId();
        BillOfMaterial bom = findBomForActivityFacility(requestInfo, activityFacility, tenantId);
        Map<String, Object> bomData = buildBomData(requestInfo, activityFacility, bom);
        bomData.put(DOCUMENTS_KEY, toPdfDocuments(workflowDocuments));
//        bomData.putAll(buildSerialNumbersByAssetType(requestInfo, activityFacility.getId(), tenantId));

        GenerateBOMPdfRequest pdfRequest = GenerateBOMPdfRequest.builder()
                .requestInfo(requestInfo)
                .solution(solutionId)
                .bomData(bomData)
                .build();

        String fileStoreId = bomService.generateAndSaveBOMPdfToFilestore(pdfRequest, tenantId);
        log.info("BOM installation report PDF generated for activityFacilityId: {}, filestoreId: {}",
                activityFacility.getId(), fileStoreId);
        return fileStoreId;
    }

    private boolean isMachineComponent(ActivityFacility activityFacility) {
        return COMPONENT_TYPE_MACHINE.equalsIgnoreCase(activityFacility.getComponentType());
    }

    /**
     * MACHINE-component installation report: unlike SOLAR (built from the BOM row), this is built
     * from asset-registry data for the single machine asset linked to this activity facility - one
     * MACHINE-type ActivityFacility row always corresponds to exactly one asset (see
     * ActivityFacility.componentType javadoc). No BOM lookup, no MDMS image-grouping pass: asset
     * documents are grouped by their own documentType and attached as-is.
     */
    private String generateMachineInstallationReportPdf(RequestInfo requestInfo, ActivityFacility activityFacility) {
        String tenantId = activityFacility.getTenantId();
        Asset asset = findAssetForActivityFacility(requestInfo, activityFacility.getId(), tenantId);

        Map<String, Object> bomData = buildMachineReportData(requestInfo, activityFacility, asset);
        bomData.put(DOCUMENTS_KEY, toMachinePdfDocuments(asset.getDocuments()));

        GenerateBOMPdfRequest pdfRequest = GenerateBOMPdfRequest.builder()
                .requestInfo(requestInfo)
                .solution(BomService.MACHINE_REPORT_SOLUTION_KEY)
                .bomData(bomData)
                .build();

        String fileStoreId = bomService.generateAndSaveBOMPdfToFilestore(pdfRequest, tenantId);
        log.info("Machine installation report PDF generated for activityFacilityId: {}, filestoreId: {}",
                activityFacility.getId(), fileStoreId);
        return fileStoreId;
    }

    private Asset findAssetForActivityFacility(RequestInfo requestInfo, String activityFacilityId, String tenantId) {
        List<Asset> assets = searchAssets(requestInfo, activityFacilityId, tenantId);
        if (assets.isEmpty()) {
            log.error("No asset found for activityFacilityId: {}", activityFacilityId);
            throw new CustomException("BOM_PDF_GENERATION_FAILED",
                    "No asset found for activityFacilityId: " + activityFacilityId);
        }
        return assets.get(0);
    }

    private Map<String, Object> buildMachineReportData(RequestInfo requestInfo, ActivityFacility activityFacility, Asset asset) {
        Map<String, Object> data = new HashMap<>();
        Facility facility = activityFacility.getFacility();
        Map<String, Object> assetDetails = asset.getAssetDetails() != null ? asset.getAssetDetails() : Map.of();
        String nowFormatted = REPORT_TIMESTAMP_FORMATTER.format(java.time.ZonedDateTime.now(ZoneId.systemDefault()));

        data.put("report_location", facility != null ? facility.getFacilityName() : null);
        data.put("report_date", LocalDate.now().format(PROJECT_DATE_FORMATTER));

        data.put("machine_po_number", assetDetails.get("poNumber"));
        data.put("machine_serial_number", asset.getSerialNumber());
        data.put("machine_solution_name", resolveSolutionName(requestInfo, activityFacility));
        data.put("machine_manufacturer_invoice_number", assetDetails.get("invoiceNumber"));
        data.put("machine_specifications_capacity", assetDetails.get("capacity"));
        data.put("machine_warranty_years", asset.getWarrantyDuration());

        data.put("end_user_name", facility != null ? facility.getFacilityPocName() : null);
        data.put("end_user_contact_no", facility != null ? facility.getFacilityPocPhone() : null);
        data.put("end_user_registered_mobile", facility != null ? facility.getFacilityPocPhone() : null);
        data.put("end_user_verified_at", nowFormatted);
        data.put("end_user_verification_status", VERIFICATION_STATUS_DEFAULT);
        data.put("end_user_verification_id", "");

        String technicianName = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getName() : null;
        String technicianMobile = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getMobileNumber() : null;
        data.put("technician_name", technicianName);
        data.put("technician_contact_no", technicianMobile);
        data.put("technician_registered_mobile", technicianMobile);
        data.put("technician_vendor_organisation",
                vendorDirectory.organisationName(requestInfo, activityFacility.getTenantId(), asset.getVendorId()));
        data.put("technician_submitted_at", nowFormatted);

        data.put("handover_trained_end_user", yesNo(assetDetails.get("trainedEndUser")));

        return data;
    }

    private String resolveSolutionName(RequestInfo requestInfo, ActivityFacility activityFacility) {
        Map<String, Object> solution = mdmsUtils.fetchInstallationSolutionByCode(
                requestInfo, activityFacility.getTenantId(), activityFacility.getSolutionId());
        return solution != null && solution.get("name") != null ? String.valueOf(solution.get("name")) : null;
    }

    private String yesNo(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean) {
            return ((Boolean) value) ? "Yes" : "No";
        }
        return "true".equalsIgnoreCase(String.valueOf(value)) ? "Yes" : "No";
    }

    /**
     * Groups the machine asset's own documents by their existing documentType (e.g.
     * MACHINE_CIVIL_WORK, ASSET_PHOTO-MACHINE) into BomPdfDocument{documentType, fileStoreIds} -
     * the shape machine_installation_report's pdf-service data-config reads photos from. No MDMS
     * InstallationImages lookup or repositioning (that is SOLAR-only, see BomService.enrichBomData) -
     * the field app's own documentType tags are used as-is.
     */
    private List<BomPdfDocument> toMachinePdfDocuments(List<org.egov.common.contract.models.Document> assetDocuments) {
        if (assetDocuments == null || assetDocuments.isEmpty()) {
            return new ArrayList<>();
        }
        Map<String, List<String>> fileStoreIdsByType = new LinkedHashMap<>();
        for (org.egov.common.contract.models.Document document : assetDocuments) {
            if (document == null || document.getDocumentType() == null || document.getFileStore() == null) {
                continue;
            }
            fileStoreIdsByType.computeIfAbsent(document.getDocumentType(), k -> new ArrayList<>()).add(document.getFileStore());
        }
        List<BomPdfDocument> pdfDocuments = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : fileStoreIdsByType.entrySet()) {
            pdfDocuments.add(BomPdfDocument.builder()
                    .documentType(entry.getKey())
                    .fileStoreIds(entry.getValue())
                    .build());
        }
        return pdfDocuments;
    }

    private String resolveSystemType(ActivityFacility activityFacility) {
        Object systemType = activityFacility.getAdditionalDetails() != null
                ? activityFacility.getAdditionalDetails().get(SYSTEM_TYPE_KEY)
                : null;
        if (systemType == null || String.valueOf(systemType).isBlank()) {
            log.error("systemType missing on activityFacility additionalDetails, activityFacilityId: {}", activityFacility.getId());
            throw new CustomException("BOM_PDF_GENERATION_FAILED",
                    "systemType is missing on activityFacility " + activityFacility.getId() + " - cannot select a BOM report template");
        }
        return String.valueOf(systemType);
    }

    private BillOfMaterial findBomForActivityFacility(RequestInfo requestInfo, ActivityFacility activityFacility, String tenantId) {
        BomSearchCriteria criteria = BomSearchCriteria.builder()
                .activityFacilityId(List.of(activityFacility.getId()))
                .tenantId(tenantId)
                .build();
        BomSearchRequest searchRequest = BomSearchRequest.builder()
                .requestInfo(requestInfo)
                .criteria(criteria)
                .build();
        List<BillOfMaterial> boms = bomService.searchBillOfMaterials(searchRequest, 1, 0, tenantId, false, null);
        if (boms == null || boms.isEmpty()) {
            log.error("No BOM found for activityFacilityId: {}", activityFacility.getId());
            throw new CustomException("BOM_PDF_GENERATION_FAILED",
                    "No BOM found for activityFacilityId: " + activityFacility.getId());
        }
        return boms.get(0);
    }

    private Map<String, Object> buildBomData(RequestInfo requestInfo, ActivityFacility activityFacility, BillOfMaterial bom) {
        Map<String, Object> data = new HashMap<>();
        if (bom.getData() != null) {
            data.putAll(bom.getData());
            data.put("report_tender_no", bom.getData().get("tender_number"));
            data.put("report_no", bom.getData().get("report_number"));
            data.put("report_po_wo_number", bom.getData().get("purchase_order_number"));
            data.put("report_invoice_number", bom.getData().get("invoice_number"));
        }

        Asset asset = findAssetForActivityFacility(requestInfo, activityFacility.getId(), activityFacility.getTenantId());

        Facility facility = activityFacility.getFacility();
        String nowFormatted = REPORT_TIMESTAMP_FORMATTER.format(java.time.ZonedDateTime.now(ZoneId.systemDefault()));
        // facility.getBoundary() is already populated by facility-service on every facility fetch,
        // but with boundary codes (e.g. India_Assam_Darrang), not human-readable names - localize
        // both levels in one call.
        Boundary boundary = (facility != null) ? facility.getBoundary() : null;
        Map<String, String> boundaryNames = localizeBoundary(boundary, requestInfo);

        Map<String, Object> solution = mdmsUtils.fetchInstallationSolutionByCode(
                requestInfo, activityFacility.getTenantId(), activityFacility.getSolutionId());
        data.put("solution_sector", solution != null ? solution.get("sectorName") : null);
        data.put("solution_sunshine_hours", solution != null ? solution.get("sunshineHrsMin")+" Hours" : null);

        data.put("site_name", facility != null ? facility.getFacilityName() : null);
        data.put("site_pincode", facility != null && facility.getAddress() != null
                ? facility.getAddress().getPincode() : null);
        data.put("site_latitude", facility != null && facility.getAddress() != null
                ? facility.getAddress().getLatitude() : null);
        data.put("site_longitude", facility != null && facility.getAddress() != null
                ? facility.getAddress().getLongitude() : null);
//        data.put("vendor_name", resolveVendorName(bom));
//        data.put("project_number", activityFacility.getFieldPlan() != null && activityFacility.getFieldPlan().getProject() != null
//                ? activityFacility.getFieldPlan().getProject().getProjectNumber() : null);
//        data.put("health_facility_type", facility != null ? facility.getFacilityType() : null);
        data.put("site_state", boundary != null
                ? boundaryLocalizationUtil.localizedNameOrCode(boundaryNames, boundary.getState()) : null);
        data.put("site_district", boundary != null
                ? boundaryLocalizationUtil.localizedNameOrCode(boundaryNames, boundary.getDistrict()) : null);
        data.put("site_block_taluk", boundary != null
                ? boundaryLocalizationUtil.localizedNameOrCode(boundaryNames, boundary.getBlock()) : null);
        data.put("report_date", resolveProjectDate(requestInfo, activityFacility).format(PROJECT_DATE_FORMATTER));
        data.put("po_wo_number", resolvePoWoNumber(activityFacility));

        data.put("end_user_name", facility != null ? facility.getFacilityPocName() : null);
        data.put("end_user_contact_no", facility != null ? facility.getFacilityPocPhone() : null);
        data.put("end_user_registered_mobile", facility != null ? facility.getFacilityPocPhone() : null);
        data.put("end_user_verified_at", nowFormatted);
        data.put("end_user_verification_status", VERIFICATION_STATUS_DEFAULT);
        data.put("end_user_verification_id", "");

        String technicianName = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getName() : null;
        String technicianMobile = requestInfo.getUserInfo() != null ? requestInfo.getUserInfo().getMobileNumber() : null;
        data.put("technician_name", technicianName);
        data.put("technician_contact_no", technicianMobile);
        data.put("technician_registered_mobile", technicianMobile);
        data.put("technician_vendor_organisation",
                vendorDirectory.organisationName(requestInfo, activityFacility.getTenantId(), asset.getVendorId()));
        data.put("technician_submitted_at", nowFormatted);

        return data;
    }

    /**
     * The vendor organisation the report is issued against. Mirrors
     * ActivityService#resolveVendorOrganisation: the org name is denormalised onto the BOM's
     * additionalDetails at vendor-assignment time, and the id / contact email are the only
     * fallbacks available without an extra vendor-registry round trip.
     */
    private String resolveVendorName(BillOfMaterial bom) {
        if (bom.getAdditionalDetails() != null) {
            Object orgName = bom.getAdditionalDetails().get("vendorOrgName");
            if (orgName == null) {
                orgName = bom.getAdditionalDetails().get("vendorOrganisation");
            }
            if (orgName != null && !String.valueOf(orgName).isBlank()) {
                return String.valueOf(orgName);
            }
        }
        if (bom.getVendorOrgId() != null && !bom.getVendorOrgId().isBlank()) {
            return bom.getVendorOrgId();
        }
        return bom.getVendorEmail();
    }

    /**
     * PO/WO number of the plan this facility belongs to. Unlike the reference implementation, this
     * fork keeps poc_number on activity_assignments rather than field_plans, so it is read from
     * there; a plan with no assignment row yet simply renders no number.
     */
    private String resolvePoWoNumber(ActivityFacility activityFacility) {
        try {
            return activityAssignmentRepository.getPocNumberByFieldPlanId(activityFacility.getFieldPlanId());
        } catch (Exception e) {
            log.warn("Could not resolve poc_number for fieldPlanId: {}", activityFacility.getFieldPlanId(), e);
            return null;
        }
    }

    /**
     * "project_date" business rule: the submission date, updated to the latest resubmission date
     * on every reject-then-resubmit cycle, then frozen once the report is approved.
     * <p>
     * This method only ever runs while handling a report (re)submission action (see
     * ActivityService#updateFacilityWorkflow), i.e. before that action's own transition is
     * recorded in workflow-v2 - so "now" already IS this submission's date, covering both the
     * first submission and every later resubmission. The workflow history lookup only matters for
     * the frozen case: if this ever ran again after approval, it falls back to the last recorded
     * submission's timestamp instead of today's date.
     */
    private LocalDate resolveProjectDate(RequestInfo requestInfo, ActivityFacility activityFacility) {
        List<ProcessInstance> history;
        try {
            history = facilityWorkflowService.getProcessInstanceById(
                    activityFacility.getId(), activityFacility.getTenantId(), requestInfo);
        } catch (Exception e) {
            log.warn("Could not fetch workflow history for activityFacilityId: {}, defaulting project_date to today", activityFacility.getId(), e);
            return LocalDate.now();
        }
        if (history == null) {
            return LocalDate.now();
        }

        boolean alreadyApproved = history.stream()
                .anyMatch(pi -> pi != null && ACTION_APPROVE.equalsIgnoreCase(pi.getAction()));
        if (!alreadyApproved) {
            return LocalDate.now();
        }

        Long latestSubmissionMillis = history.stream()
                .filter(pi -> pi != null && pi.getAction() != null)
                .filter(pi -> isSubmitReportAction(pi.getAction()))
                .map(pi -> pi.getAuditDetails() != null ? pi.getAuditDetails().getCreatedTime() : null)
                .filter(Objects::nonNull)
                .max(Long::compareTo)
                .orElse(null);

        return latestSubmissionMillis != null
                ? Instant.ofEpochMilli(latestSubmissionMillis).atZone(ZoneId.systemDefault()).toLocalDate()
                : LocalDate.now();
    }

    private boolean isSubmitReportAction(String action) {
        return ACTION_SUBMIT_REPORT.equalsIgnoreCase(action)
                || ACTION_SUBMIT_REPORT_A.equalsIgnoreCase(action)
                || ACTION_SUBMIT_REPORT_B.equalsIgnoreCase(action);
    }

    /**
     * Groups the serial numbers of the facility's assets by asset type, one bomData entry per type:
     * <pre>
     * "panel_serial_number": [ { "srNo": 1, "serialNumber": "001" }, ... ]
     * </pre>
     * srNo restarts at 1 for each type and follows the order asset-registry returns.
     */
    private Map<String, Object> buildSerialNumbersByAssetType(RequestInfo requestInfo, String activityFacilityId, String tenantId) {
        Map<String, List<Map<String, Object>>> serialNumbersByKey = new LinkedHashMap<>();
        for (String bomDataKey : SERIAL_NUMBER_KEY_BY_ASSET_TYPE.values()) {
            serialNumbersByKey.put(bomDataKey, new ArrayList<>());
        }

        for (Asset asset : searchAssets(requestInfo, activityFacilityId, tenantId)) {
            if (asset == null || asset.getAssetTypeID() == null) {
                continue;
            }
            String bomDataKey = SERIAL_NUMBER_KEY_BY_ASSET_TYPE.get(asset.getAssetTypeID().toUpperCase());
            if (bomDataKey == null || asset.getSerialNumber() == null || asset.getSerialNumber().isBlank()) {
                continue;
            }
            List<Map<String, Object>> serialNumbers = serialNumbersByKey.get(bomDataKey);
            Map<String, Object> entry = new HashMap<>();
            entry.put(SR_NO_KEY, serialNumbers.size() + 1);
            entry.put(SERIAL_NUMBER_KEY, asset.getSerialNumber());
            serialNumbers.add(entry);
        }

        log.debug("Resolved asset serial numbers for activityFacilityId: {} -> {}", activityFacilityId,
                serialNumbersByKey.entrySet().stream()
                        .map(entry -> entry.getKey() + "=" + entry.getValue().size())
                        .toList());
        return new LinkedHashMap<>(serialNumbersByKey);
    }

    /**
     * All assets recorded against the activity facility. limit is sent explicitly because
     * asset-registry defaults it to 10, which would silently drop serial numbers.
     */
    private List<Asset> searchAssets(RequestInfo requestInfo, String activityFacilityId, String tenantId) {
        AssetSearchRequest searchRequest = AssetSearchRequest.builder()
                .requestInfo(requestInfo)
                .criteria(AssetSearchCriteria.builder()
                        .activityFacilityID(activityFacilityId)
                        .tenantId(tenantId)
                        .build())
                .build();

        StringBuilder uri = new StringBuilder(activityConfiguration.getAssetHost())
                .append(activityConfiguration.getAssetSearchUrl())
                .append("?offset=0&limit=").append(activityConfiguration.getAssetSearchLimit());

        try {
            // The endpoint responds with a bare Asset array, not an envelope.
            List<Asset> assets = serviceRequest.fetchResult(uri, searchRequest, new TypeReference<List<Asset>>() {});
            return assets != null ? assets : List.of();
        } catch (Exception e) {
            log.error("Failed to fetch assets for activityFacilityId: {}", activityFacilityId, e);
            throw new CustomException("BOM_PDF_GENERATION_FAILED",
                    "Failed to fetch assets for activityFacility " + activityFacilityId + " - cannot resolve serial numbers");
        }
    }

    /**
     * Selects the workflow documents the report needs - every INSTALLATION_IMAGE-* one plus the
     * appendable types - and flattens them to the raw, ungrouped shape BomService expects under
     * "documents": plain Maps keyed by documentType/fileStoreId.
     * <p>
     * Plain Maps rather than {@link Document} instances on purpose: BomService.enrichBomData reads
     * this list as {@code List<Map<String, Object>>} and would fail on POJO elements. Entries without
     * a fileStoreId are dropped - both downstream consumers ignore them anyway.
     */
    private List<Map<String, Object>> toPdfDocuments(List<Document> workflowDocuments) {
        List<Map<String, Object>> pdfDocuments = new ArrayList<>();
        if (workflowDocuments == null || workflowDocuments.isEmpty()) {
            return pdfDocuments;
        }

        for (Document document : workflowDocuments) {
            if (document == null || document.getDocumentType() == null || document.getFileStoreId() == null) {
                continue;
            }
            if (!isReportDocument(document.getDocumentType())) {
                continue;
            }
            Map<String, Object> pdfDocument = new HashMap<>();
            pdfDocument.put(DOCUMENT_TYPE_KEY, document.getDocumentType());
            pdfDocument.put(FILE_STORE_ID_KEY, document.getFileStoreId());
            pdfDocuments.add(pdfDocument);
        }

        log.debug("Carrying {} of {} workflow documents into the BOM report data",
                pdfDocuments.size(), workflowDocuments.size());
        return pdfDocuments;
    }

    private boolean isReportDocument(String documentType) {
        return documentType.contains(INSTALLATION_IMAGE_DOCUMENT_TYPE_PREFIX)
                || APPENDABLE_DOCUMENT_TYPES.contains(documentType);
    }

    /* State/block names for one boundary, resolved in a single localization call. */
    private Map<String, String> localizeBoundary(Boundary boundary, RequestInfo requestInfo) {
        if (boundary == null) {
            return Map.of();
        }
        List<String> boundaryCodes = Stream.of(boundary.getState(), boundary.getDistrict(), boundary.getBlock())
                .filter(Objects::nonNull)
                .toList();
        return boundaryLocalizationUtil.localizeBoundaryCodes(boundaryCodes, requestInfo);
    }
}
