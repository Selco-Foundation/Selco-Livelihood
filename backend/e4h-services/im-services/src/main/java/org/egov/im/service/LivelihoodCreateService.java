package org.egov.im.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.LivelihoodIssueTypeUtil;
import org.egov.im.util.LivelihoodTenantUtil;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Workflow;
import org.egov.im.web.models.asset.Asset;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Arrays;
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

        String vendorUserUuid = resolveVendorUserUuid(asset, request.getRequestInfo(), incident.getTenantId());
        workflow.setAssignes(List.of(vendorUserUuid));
        workflow.setAction(LIVELIHOOD_WF_AUTO_ASSIGN);

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

        if (incident.getEntryChannel() == null || incident.getEntryChannel().isBlank()) {
            if (isPocUser(requestInfo)) {
                incident.setEntryChannel(ENTRY_CHANNEL_POC_MANUAL);
            } else {
                incident.setEntryChannel(ENTRY_CHANNEL_DIRECT);
            }
        }

        if (incident.getCreatedOnBehalf() == null) {
            incident.setCreatedOnBehalf(isPocUser(requestInfo));
        }

        if (StringUtils.isEmpty(incident.getReporterType())) {
            incident.setReporterType(isPocUser(requestInfo) ? ROLE_LIVELIHOOD_POC : ROLE_COMPLAINANT);
        }
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
}
