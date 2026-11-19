package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.repository.IMRepository;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.HRMSUtil;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.util.LivelihoodPocScopeService;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.im.web.models.User;
import org.egov.im.web.models.Workflow;
import org.egov.im.web.models.asset.Asset;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.egov.im.util.IMConstants.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivelihoodCreateService {

    private static final List<String> VENDOR_UUID_KEYS = Arrays.asList(
            "vendorUserUuid", "vendorEmployeeUuid", "assignedVendorUserId", "vendorUserId"
    );

    private static final Set<String> OPEN_DUPLICATE_STATUSES = Set.of(
            "PENDING_FOR_RESOLUTION",
            "OUT_OF_SCOPE_PENDING_POC",
            "OUT_OF_SCOPE_PENDING_VENDOR",
            "OUT_OF_WARRANTY_PENDING_VENDOR",
            "RESOLVED"
    );

    private final IMRepository imRepository;
    private final AssetRegistryUtil assetRegistryUtil;
    private final LivelihoodTenantUtil livelihoodTenantUtil;
    private final VendorRegistryUtil vendorRegistryUtil;
    private final LivelihoodIssueTypeUtil livelihoodIssueTypeUtil;
    private final LivelihoodPocScopeService livelihoodPocScopeService;
    private final HRMSUtil hrmsUtil;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public void prepareCreate(IncidentRequest request, Object mdmsData) {
        if (!livelihoodTenantUtil.isLivelihood(request.getIncident().getTenantId())) {
            return;
        }

        Incident incident = request.getIncident();
        Workflow workflow = request.getWorkflow();
        if (workflow == null) {
            throw new CustomException("INVALID_REQUEST", "Workflow is required for Livelihood incident creation");
        }

        validateVerificationDocuments(workflow);

        Asset asset = assetRegistryUtil.fetchAsset(
                request.getRequestInfo(),
                incident.getTenantId(),
                incident.getAssetId(),
                incident.getFacilityId()
        );

        if (asset.getFacilityID() == null
                || !asset.getFacilityID().equalsIgnoreCase(incident.getFacilityId())) {
            throw new CustomException(
                    "INVALID_ASSET_FACILITY",
                    "Asset facility does not match the provided facilityId"
            );
        }

        String assetCategory = livelihoodIssueTypeUtil.resolveAssetCategory(
                request.getRequestInfo(),
                incident.getTenantId(),
                asset
        );
        livelihoodIssueTypeUtil.validateIssueType(incident.getIncidentType(), assetCategory, mdmsData);
        livelihoodIssueTypeUtil.storeAssetCategory(incident, assetCategory);
        incident.setIncidentSubType(null);

        if (StringUtils.isBlank(incident.getBoundaryCode()) && StringUtils.isNotBlank(asset.getBoundaryCode())) {
            incident.setBoundaryCode(asset.getBoundaryCode());
        }

        livelihoodPocScopeService.assertBoundaryInScope(
                request.getRequestInfo(),
                incident.getTenantId(),
                incident.getBoundaryCode()
        );

        String vendorUserUuid = resolveVendorUserUuid(asset, request.getRequestInfo(), incident.getTenantId());
        workflow.setAssignes(List.of(vendorUserUuid));
        workflow.setAction(resolveCreateWorkflowAction(request.getRequestInfo()));

        enrichEntryMetadata(request);
    }

    private void validateVerificationDocuments(Workflow workflow) {
        if (CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            return;
        }
        int maxFiles = 7;
        if (workflow.getVerificationDocuments().size() > maxFiles) {
            throw new CustomException("INVALID_DOCUMENTS", "Cannot attach more than " + maxFiles + " files");
        }
        for (Document document : workflow.getVerificationDocuments()) {
            if (document == null || StringUtils.isEmpty(document.getFileStoreId())) {
                throw new CustomException("INVALID_DOCUMENTS", "fileStoreId is required for each verification document");
            }
            if (document.getDocumentType() != null) {
                String type = document.getDocumentType().toUpperCase();
                if (!IMAGE_DOCUMENT_TYPE.equals(type) && !"VIDEO".equals(type) && !"HLS".equals(type)) {
                    throw new CustomException(
                            "INVALID_DOCUMENTS",
                            "Only PHOTO, VIDEO and HLS document types are supported during ticket creation"
                    );
                }
            }
        }
    }

    private String resolveVendorUserUuid(Asset asset, RequestInfo requestInfo, String tenantId) {
        if (StringUtils.isNotBlank(asset.getVendorId())) {
            String vendorId = asset.getVendorId().trim();
            if (isUuid(vendorId)) {
                return vendorId;
            }
            String resolved = vendorRegistryUtil.resolveVendorUserUuid(requestInfo, tenantId, vendorId);
            if (StringUtils.isNotBlank(resolved)) {
                return resolved;
            }
        }

        String vendorUuid = extractVendorUuid(asset.getAdditionalDetails());
        if (StringUtils.isEmpty(vendorUuid)) {
            vendorUuid = extractVendorUuid(asset.getAssetDetails());
        }
        if (StringUtils.isEmpty(vendorUuid)) {
            throw new CustomException(
                    "VENDOR_NOT_MAPPED",
                    "No vendor is mapped to the selected asset. Ticket creation cannot proceed."
            );
        }
        return vendorUuid;
    }

    private boolean isUuid(String value) {
        return value.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    }

    private String extractVendorUuid(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return null;
        }
        for (String key : VENDOR_UUID_KEYS) {
            Object value = details.get(key);
            if (value != null && StringUtils.isNotBlank(String.valueOf(value))) {
                return String.valueOf(value).trim();
            }
        }
        Object vendorId = details.get("vendorId");
        if (vendorId != null && StringUtils.isNotBlank(String.valueOf(vendorId))) {
            return String.valueOf(vendorId).trim();
        }
        return null;
    }

    private void enrichEntryMetadata(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();
        boolean pocUser = isPocUser(requestInfo);

        if (incident.getEntryChannel() == null || incident.getEntryChannel().isBlank()) {
            incident.setEntryChannel(pocUser ? ENTRY_CHANNEL_POC_MANUAL : ENTRY_CHANNEL_DIRECT);
        }

        // IVR/WhatsApp: only end users call in. The API caller is the IVR backend's service account,
        // so the reporter is the facility's end user, verified against the caller's phone number.
        if (ENTRY_CHANNEL_IVR_WHATSAPP.equalsIgnoreCase(incident.getEntryChannel())) {
            resolveIvrEndUser(request);
            rejectIvrDuplicate(incident);
            return;
        }

        if (incident.getCreatedOnBehalf() == null) {
            incident.setCreatedOnBehalf(pocUser);
        }

        if (pocUser || Boolean.TRUE.equals(incident.getCreatedOnBehalf())) {
            enrichOnBehalfComplainant(request);
            return;
        }

        if (StringUtils.isEmpty(incident.getReporterType())) {
            incident.setReporterType(ROLE_COMPLAINANT);
        }
    }

    /**
     * IVR tickets are raised by the end user themselves: the reporter is the facility's registered end user
     * (HRMS COMPLAINANT at the facility boundary), and the caller — {@code reporter.mobileNumber}, or
     * {@code reporter.uuid} — must be that same user. Rejects the request otherwise; never creates a user.
     */
    private void resolveIvrEndUser(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();

        User sent = incident.getReporter();
        String callerMobile = sent != null ? StringUtils.trimToNull(sent.getMobileNumber()) : null;
        String callerUuid = sent != null ? StringUtils.trimToNull(sent.getUuid()) : null;
        if (callerMobile == null && callerUuid == null) {
            throw new CustomException(
                    "IVR_CALLER_REQUIRED",
                    "reporter.mobileNumber of the IVR caller is required for IVR/WhatsApp tickets"
            );
        }

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                requestInfo,
                incident.getTenantId(),
                resolveFacilityBoundary(incident)
        );
        User endUser = userService.resolveReporterFromComplainant(complainant, requestInfo, incident.getTenantId());

        boolean callerIsEndUser = endUser != null && (
                (callerUuid != null && callerUuid.equals(endUser.getUuid()))
                        || (callerMobile != null && (samePhone(callerMobile, endUser.getMobileNumber())
                        || samePhone(callerMobile, endUser.getUserName())))
        );
        if (!callerIsEndUser) {
            log.warn("IVR caller does not match the facility end user | facilityId={}", incident.getFacilityId());
            throw new CustomException(
                    "IVR_CALLER_NOT_END_USER",
                    "Caller is not the registered end user of facility " + incident.getFacilityId()
            );
        }

        incident.setReporter(endUser);
        incident.setAccountId(endUser.getUuid());
        incident.setCreatedOnBehalf(false);
        incident.setReporterType(ROLE_COMPLAINANT);
    }

    /**
     * The web app warns about an open ticket for the same asset and issue type and lets the user decide;
     * IVR has no one to confirm, so the duplicate is rejected and the existing ticket id returned instead.
     * Uses the same open statuses as the web check (livelihood-ui OPEN_DUPLICATE_APPLICATION_STATUSES).
     */
    private void rejectIvrDuplicate(Incident incident) {
        RequestSearchCriteria criteria = RequestSearchCriteria.builder()
                .tenantId(incident.getTenantId())
                .assetIds(Set.of(incident.getAssetId()))
                .incidentType(Set.of(incident.getIncidentType().trim()))
                .applicationStatus(OPEN_DUPLICATE_STATUSES)
                .offset(0)
                .limit(5)
                .build();
        List<Incident> open = imRepository.getIncidents(criteria);
        if (CollectionUtils.isEmpty(open)) {
            return;
        }
        String existingIds = open.stream()
                .map(Incident::getIncidentId)
                .collect(Collectors.joining(", "));
        throw new CustomException(
                "IVR_DUPLICATE_TICKET",
                "An open ticket already exists for this asset and issue type: " + existingIds
        );
    }

    /** Compares the last 10 digits, so "+91 63617 82350" and "6361782350" match. */
    private static boolean samePhone(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        String da = a.replaceAll("\\D", "");
        String db = b.replaceAll("\\D", "");
        if (da.length() < 10 || db.length() < 10) {
            return false;
        }
        return da.substring(da.length() - 10).equals(db.substring(db.length() - 10));
    }

    private void enrichOnBehalfComplainant(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();

        incident.setCreatedOnBehalf(true);
        incident.setReporterType(ROLE_COMPLAINANT);

        if (requestInfo != null && requestInfo.getUserInfo() != null
                && StringUtils.isNotBlank(requestInfo.getUserInfo().getUuid())) {
            storeRaisedByPoc(incident, requestInfo.getUserInfo().getUuid());
        }

        Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                requestInfo,
                incident.getTenantId(),
                resolveFacilityBoundary(incident)
        );
        User reporter = userService.resolveReporterFromComplainant(
                complainant, requestInfo, incident.getTenantId());
        incident.setAccountId(reporter.getUuid());
        incident.setReporter(reporter);
    }

    /**
     * COMPLAINANT HRMS users are registered at facility boundary; incident boundary is asset-level.
     */
    private String resolveFacilityBoundary(Incident incident) {
        String assetBoundary = incident.getBoundaryCode();
        String assetId = incident.getAssetId();
        if (StringUtils.isNotBlank(assetBoundary) && StringUtils.isNotBlank(assetId)) {
            String suffix = "_" + assetId;
            if (assetBoundary.endsWith(suffix)) {
                return assetBoundary.substring(0, assetBoundary.length() - suffix.length());
            }
        }
        return assetBoundary;
    }

    private void storeRaisedByPoc(Incident incident, String pocUuid) {
        Map<String, Object> details = toMutableMap(incident.getAdditionalDetail());
        details.put(LIVELIHOOD_RAISED_BY_POC_DETAIL_KEY, pocUuid);
        incident.setAdditionalDetail(details);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMutableMap(Object additionalDetail) {
        if (additionalDetail == null) {
            return new HashMap<>();
        }
        if (additionalDetail instanceof Map<?, ?> map) {
            return new HashMap<>((Map<String, Object>) map);
        }
        return objectMapper.convertValue(additionalDetail, Map.class);
    }

    private boolean isPocUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> ROLE_LIVELIHOOD_POC.equalsIgnoreCase(code));
    }

    /**
     * LivelihoodIncident start state exposes two create paths:
     * CREATE for COMPLAINANT / LIVELIHOOD_POC, AUTO_ASSIGN for SYSTEM_USER (IVR/cron).
     * Vendor is still pre-assigned via workflow.assignes in both cases.
     */
    private String resolveCreateWorkflowAction(RequestInfo requestInfo) {
        if (isSystemUser(requestInfo)) {
            return LIVELIHOOD_WF_AUTO_ASSIGN;
        }
        return LIVELIHOOD_WF_CREATE;
    }

    private boolean isSystemUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> "SYSTEM_USER".equalsIgnoreCase(code));
    }
}
