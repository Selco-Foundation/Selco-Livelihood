package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.HRMSUtil;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.util.LivelihoodPocScopeService;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
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

import static org.egov.im.util.IMConstants.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivelihoodCreateService {

    private static final List<String> VENDOR_UUID_KEYS = Arrays.asList(
            "vendorUserUuid", "vendorEmployeeUuid", "assignedVendorUserId", "vendorUserId"
    );

    private final AssetRegistryUtil assetRegistryUtil;
    private final LivelihoodTenantUtil livelihoodTenantUtil;
    private final VendorRegistryUtil vendorRegistryUtil;
    private final LivelihoodIssueTypeUtil livelihoodIssueTypeUtil;
    private final LivelihoodPocScopeService livelihoodPocScopeService;
    private final HRMSUtil hrmsUtil;
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
                if (!IMAGE_DOCUMENT_TYPE.equals(type) && !"VIDEO".equals(type)) {
                    throw new CustomException(
                            "INVALID_DOCUMENTS",
                            "Only PHOTO and VIDEO document types are supported during ticket creation"
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

    private void enrichOnBehalfComplainant(IncidentRequest request) {
        Incident incident = request.getIncident();
        RequestInfo requestInfo = request.getRequestInfo();

        incident.setCreatedOnBehalf(true);
        incident.setReporterType(ROLE_COMPLAINANT);

        if (requestInfo != null && requestInfo.getUserInfo() != null
                && StringUtils.isNotBlank(requestInfo.getUserInfo().getUuid())) {
            storeRaisedByPoc(incident, requestInfo.getUserInfo().getUuid());
        }

        User reporter = incident.getReporter();
        if (reporter == null || StringUtils.isBlank(reporter.getUuid())) {
            Map<String, String> complainant = hrmsUtil.findComplainantAtBoundary(
                    requestInfo,
                    incident.getTenantId(),
                    incident.getBoundaryCode()
            );
            incident.setReporter(User.builder()
                    .uuid(complainant.get("uuid"))
                    .tenantId(StringUtils.defaultIfBlank(complainant.get("tenantId"), incident.getTenantId()))
                    .name(complainant.get("name"))
                    .mobileNumber(complainant.get("mobile"))
                    .build());
            return;
        }

        if (StringUtils.isBlank(reporter.getTenantId())) {
            reporter.setTenantId(incident.getTenantId());
        }
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
