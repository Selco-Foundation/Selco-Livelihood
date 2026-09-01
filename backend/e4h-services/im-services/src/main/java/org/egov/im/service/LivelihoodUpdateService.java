package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.im.util.AssetRegistryUtil;
import org.egov.im.util.LivelihoodVendorScopeService;
import org.egov.im.util.VendorRegistryUtil;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Workflow;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import static org.egov.im.util.IMConstants.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivelihoodUpdateService {

    private static final Set<String> RESOLVE_FROM_STATES = Set.of(
            LIVELIHOOD_PENDING_FOR_RESOLUTION,
            LIVELIHOOD_OUT_OF_SCOPE_PENDING_VENDOR,
            LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR
    );

    private static final Set<String> QUOTATION_DETAIL_KEYS = Set.of(
            LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY,
            LIVELIHOOD_OOW_QUOTATION_HISTORY_DETAIL_KEY,
            LIVELIHOOD_OOW_ENTERED_AT_DETAIL_KEY
    );

    private final LivelihoodVendorScopeService livelihoodVendorScopeService;
    private final WorkflowService workflowService;
    private final AssetRegistryUtil assetRegistryUtil;
    private final VendorRegistryUtil vendorRegistryUtil;
    private final ObjectMapper objectMapper;

    public void validateUpdate(IncidentRequest request, Incident existingIncident, List<String> currentAssignees) {
        if (request == null || request.getWorkflow() == null || existingIncident == null) {
            return;
        }

        String action = normalizeAction(request.getWorkflow().getAction());
        if (StringUtils.isBlank(action)) {
            return;
        }

        RequestInfo requestInfo = request.getRequestInfo();
        String tenantId = existingIncident.getTenantId();
        String currentStatus = normalizeStatus(existingIncident.getApplicationStatus());

        if (livelihoodVendorScopeService.isVendorAction(action)) {
            livelihoodVendorScopeService.assertAssignedToVendor(requestInfo, tenantId, currentAssignees);
        }

        switch (action) {
            case "RESOLVE" -> validateResolve(request, currentStatus);
            case "OUT_OF_SCOPE" -> validateOutOfScope(request, currentStatus);
            case "OUT_OF_WARRANTY" -> validateOutOfWarranty(request, currentStatus);
            case "REVISE_QUOTATION" -> validateReviseQuotation(request, existingIncident, currentStatus);
            case "DECLINE" -> validateDecline(request, currentStatus);
            case "REOPEN" -> validateReopen(request, existingIncident, requestInfo);
            case "ASSIGN_VENDOR" -> validateAssignVendor(request, existingIncident, requestInfo);
            default -> { }
        }
    }

    /**
     * Remaps the incident asset to the vendor selected in {@code ASSIGN_VENDOR} before workflow transition.
     */
    public void remapAssetForAssignVendor(IncidentRequest request, Incident existingIncident) {
        if (request == null || request.getWorkflow() == null || existingIncident == null) {
            return;
        }
        if (!LIVELIHOOD_WF_ASSIGN_VENDOR.equals(normalizeAction(request.getWorkflow().getAction()))) {
            return;
        }

        RequestInfo requestInfo = request.getRequestInfo();
        String tenantId = existingIncident.getTenantId();
        String assetId = existingIncident.getAssetId();
        String facilityId = existingIncident.getFacilityId();
        String newVendorUserUuid = firstAssignee(request.getWorkflow());

        String newVendorOrgId = vendorRegistryUtil.resolvePrimaryOrganisationIdForUser(
                requestInfo, tenantId, newVendorUserUuid);
        if (StringUtils.isBlank(newVendorOrgId)) {
            throw new CustomException("VENDOR_NOT_FOUND", "Could not resolve vendor organisation for assignee");
        }

        Map<String, Object> asset = assetRegistryUtil.fetchAssetAsMap(requestInfo, tenantId, assetId, facilityId);
        Object currentVendorId = asset.get("vendorId");
        String previousVendorOrgId = vendorRegistryUtil.resolveOrganisationIdForVendorKey(
                requestInfo,
                tenantId,
                currentVendorId != null ? currentVendorId.toString() : null
        );

        assetRegistryUtil.updateAssetVendorId(requestInfo, tenantId, assetId, facilityId, newVendorOrgId);

        Map<String, Object> details = toMutableMap(existingIncident.getAdditionalDetail());
        mergeRequestAdditionalDetail(details, request.getIncident().getAdditionalDetail());
        appendVendorRemapHistory(details, previousVendorOrgId, newVendorOrgId, newVendorUserUuid, requestInfo);
        request.getIncident().setAdditionalDetail(details);

        if (StringUtils.isBlank(request.getIncident().getAssetId())) {
            request.getIncident().setAssetId(assetId);
        }
        if (StringUtils.isBlank(request.getIncident().getFacilityId())) {
            request.getIncident().setFacilityId(facilityId);
        }
    }

    /**
     * Enriches {@code additionalDetail} on the update request. Uses persisted incident data as the
     * base so quotation revision does not lose {@code oowQuotation} when the client sends a partial payload.
     */
    public void prepareUpdate(IncidentRequest request, Incident existingIncident) {
        if (request == null || request.getWorkflow() == null || request.getIncident() == null) {
            return;
        }

        String action = normalizeAction(request.getWorkflow().getAction());
        if (!LIVELIHOOD_WF_OUT_OF_WARRANTY.equals(action) && !LIVELIHOOD_WF_REVISE_QUOTATION.equals(action)) {
            return;
        }

        Map<String, Object> details = toMutableMap(
                existingIncident != null ? existingIncident.getAdditionalDetail() : null);
        mergeRequestAdditionalDetail(details, request.getIncident().getAdditionalDetail());

        if (LIVELIHOOD_WF_OUT_OF_WARRANTY.equals(action)) {
            details.put(LIVELIHOOD_OOW_ENTERED_AT_DETAIL_KEY, System.currentTimeMillis());
        } else {
            archiveCurrentQuotation(details);
        }

        storeQuotationOnIncident(request, details);
        request.getIncident().setAdditionalDetail(details);
    }

    private void validateResolve(IncidentRequest request, String currentStatus) {
        if (!RESOLVE_FROM_STATES.contains(currentStatus)) {
            throw new CustomException("INVALID_ACTION", "RESOLVE is not allowed from status " + currentStatus);
        }
        requireComment(request.getWorkflow(), "RESOLVE requires a mandatory comment");
    }

    private void validateOutOfScope(IncidentRequest request, String currentStatus) {
        if (!LIVELIHOOD_PENDING_FOR_RESOLUTION.equals(currentStatus)) {
            throw new CustomException("INVALID_ACTION", "OUT_OF_SCOPE is only allowed from PENDING_FOR_RESOLUTION");
        }
        Workflow workflow = request.getWorkflow();
        if (StringUtils.isBlank(workflow.getOutOfScopeReason()) && StringUtils.isBlank(workflow.getComments())) {
            throw new CustomException("OUT_OF_SCOPE_REASON_REQUIRED",
                    "Mandatory out-of-scope reason is required (outOfScopeReason or comments)");
        }
    }

    private void validateOutOfWarranty(IncidentRequest request, String currentStatus) {
        if (!LIVELIHOOD_PENDING_FOR_RESOLUTION.equals(currentStatus)) {
            throw new CustomException("INVALID_ACTION", "OUT_OF_WARRANTY is only allowed from PENDING_FOR_RESOLUTION");
        }
        requireQuotationDocument(request.getWorkflow());
    }

    private void validateReviseQuotation(
            IncidentRequest request,
            Incident existingIncident,
            String currentStatus
    ) {
        if (!LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equals(currentStatus)) {
            throw new CustomException(
                    "INVALID_ACTION",
                    "REVISE_QUOTATION is only allowed from OUT_OF_WARRANTY_PENDING_VENDOR"
            );
        }

        Map<String, Object> details = toMutableMap(existingIncident.getAdditionalDetail());
        if (!details.containsKey(LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY)) {
            throw new CustomException("QUOTATION_NOT_FOUND", "No existing quotation found to revise");
        }
        requireQuotationDocument(request.getWorkflow());
    }

    private void validateAssignVendor(IncidentRequest request, Incident existingIncident, RequestInfo requestInfo) {
        String currentStatus = normalizeStatus(existingIncident.getApplicationStatus());
        if (!LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equals(currentStatus)) {
            throw new CustomException(
                    "INVALID_ACTION",
                    "ASSIGN_VENDOR is only allowed from OUT_OF_SCOPE_PENDING_POC"
            );
        }

        String newVendorUserUuid = firstAssignee(request.getWorkflow());
        if (StringUtils.isBlank(newVendorUserUuid)) {
            throw new CustomException("ASSIGNEE_REQUIRED", "ASSIGN_VENDOR requires a vendor assignee");
        }

        if (StringUtils.isBlank(existingIncident.getAssetId())) {
            throw new CustomException("ASSET_REQUIRED", "Incident assetId is required to assign a new vendor");
        }

        String tenantId = existingIncident.getTenantId();
        String newVendorOrgId = vendorRegistryUtil.resolvePrimaryOrganisationIdForUser(
                requestInfo, tenantId, newVendorUserUuid);
        if (StringUtils.isBlank(newVendorOrgId)) {
            throw new CustomException("VENDOR_NOT_FOUND", "Selected assignee is not linked to a vendor organisation");
        }
        if (!vendorRegistryUtil.isVendorOrganisation(requestInfo, tenantId, newVendorOrgId)) {
            throw new CustomException("INVALID_VENDOR", "Selected assignee must belong to a VENDOR organisation");
        }

        Map<String, Object> asset = assetRegistryUtil.fetchAssetAsMap(
                requestInfo,
                tenantId,
                existingIncident.getAssetId(),
                existingIncident.getFacilityId()
        );
        Object currentVendorId = asset.get("vendorId");
        String currentVendorOrgId = vendorRegistryUtil.resolveOrganisationIdForVendorKey(
                requestInfo,
                tenantId,
                currentVendorId != null ? currentVendorId.toString() : null
        );
        if (StringUtils.isNotBlank(currentVendorOrgId)
                && currentVendorOrgId.equalsIgnoreCase(newVendorOrgId)) {
            throw new CustomException(
                    "SAME_VENDOR",
                    "Selected vendor is already mapped to this asset; use REASSIGN to return the ticket to the current vendor"
            );
        }
    }

    private void validateDecline(IncidentRequest request, String currentStatus) {
        if (!LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equals(currentStatus)) {
            throw new CustomException("INVALID_ACTION", "DECLINE is only allowed from OUT_OF_WARRANTY_PENDING_VENDOR");
        }
        requireComment(request.getWorkflow(), "DECLINE requires a mandatory comment");
    }

    private void validateReopen(IncidentRequest request, Incident existingIncident, RequestInfo requestInfo) {
        if (!LIVELIHOOD_RESOLVED.equals(normalizeStatus(existingIncident.getApplicationStatus()))) {
            throw new CustomException("INVALID_ACTION", "REOPEN is only allowed from RESOLVED");
        }
        requireComment(request.getWorkflow(), "REOPEN requires a mandatory comment");
        assertComplainantCanReopen(requestInfo, existingIncident);

        Long resolvedAt = workflowService.getLatestResolvedTimestamp(
                existingIncident.getTenantId(),
                existingIncident.getIncidentId(),
                requestInfo
        );
        if (resolvedAt == null && existingIncident.getAuditDetails() != null) {
            resolvedAt = existingIncident.getAuditDetails().getLastModifiedTime();
        }
        if (resolvedAt == null) {
            throw new CustomException("REOPEN_TIMESTAMP_MISSING", "Could not determine resolution timestamp");
        }
        if (System.currentTimeMillis() - resolvedAt > LIVELIHOOD_REOPEN_WINDOW_MS) {
            throw new CustomException(REOPEN_WINDOW_EXPIRED_CODE, REOPEN_WINDOW_EXPIRED_MSG);
        }
    }

    private void requireQuotationDocument(Workflow workflow) {
        if (CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            throw new CustomException("QUOTATION_REQUIRED",
                    "Mandatory quotation document (verificationDocuments with fileStoreId) is required");
        }
        boolean hasFile = workflow.getVerificationDocuments().stream()
                .anyMatch(doc -> doc != null && StringUtils.isNotBlank(doc.getFileStoreId()));
        if (!hasFile) {
            throw new CustomException("QUOTATION_REQUIRED",
                    "Mandatory quotation document must include a fileStoreId");
        }
    }

    private void storeQuotationOnIncident(IncidentRequest request, Map<String, Object> details) {
        Workflow workflow = request.getWorkflow();
        if (CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            return;
        }

        Document primaryDoc = workflow.getVerificationDocuments().stream()
                .filter(doc -> doc != null && StringUtils.isNotBlank(doc.getFileStoreId()))
                .findFirst()
                .orElse(null);
        if (primaryDoc == null) {
            return;
        }

        Map<String, Object> quotation = new HashMap<>();
        quotation.put("fileStoreId", primaryDoc.getFileStoreId());
        if (StringUtils.isNotBlank(primaryDoc.getDocumentType())) {
            quotation.put("documentType", primaryDoc.getDocumentType());
        }
        if (StringUtils.isNotBlank(workflow.getComments())) {
            quotation.put("details", workflow.getComments());
        }
        quotation.put("uploadedAt", System.currentTimeMillis());
        details.put(LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY, quotation);
    }

    @SuppressWarnings("unchecked")
    private void archiveCurrentQuotation(Map<String, Object> details) {
        Object currentQuotation = details.get(LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY);
        if (!(currentQuotation instanceof Map<?, ?>)) {
            return;
        }

        List<Map<String, Object>> history = new ArrayList<>();
        Object existingHistory = details.get(LIVELIHOOD_OOW_QUOTATION_HISTORY_DETAIL_KEY);
        if (existingHistory instanceof List<?> list) {
            for (Object entry : list) {
                if (entry instanceof Map<?, ?> map) {
                    history.add(new HashMap<>((Map<String, Object>) map));
                }
            }
        }
        history.add(new HashMap<>((Map<String, Object>) currentQuotation));
        details.put(LIVELIHOOD_OOW_QUOTATION_HISTORY_DETAIL_KEY, history);
    }

    private void mergeRequestAdditionalDetail(Map<String, Object> target, Object requestAdditionalDetail) {
        if (requestAdditionalDetail == null) {
            return;
        }
        Map<String, Object> fromRequest = toMutableMap(requestAdditionalDetail);
        fromRequest.forEach((key, value) -> {
            if (!QUOTATION_DETAIL_KEYS.contains(key)) {
                target.put(key, value);
            }
        });
    }

    private void assertComplainantCanReopen(RequestInfo requestInfo, Incident existingIncident) {
        if (requestInfo == null || requestInfo.getUserInfo() == null) {
            throw new CustomException(REOPEN_ACCESS_DENIED_CODE, REOPEN_ACCESS_DENIED_MSG);
        }
        User user = requestInfo.getUserInfo();
        if (StringUtils.isNotBlank(existingIncident.getAccountId())
                && existingIncident.getAccountId().equalsIgnoreCase(user.getUuid())) {
            return;
        }
        throw new CustomException(REOPEN_ACCESS_DENIED_CODE, REOPEN_ACCESS_DENIED_MSG);
    }

    private void requireComment(Workflow workflow, String message) {
        if (workflow == null || StringUtils.isBlank(workflow.getComments())) {
            throw new CustomException("COMMENT_REQUIRED", message);
        }
    }

    private String normalizeAction(String action) {
        return action == null ? "" : action.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
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

    private String firstAssignee(Workflow workflow) {
        if (workflow == null || CollectionUtils.isEmpty(workflow.getAssignes())) {
            return null;
        }
        return workflow.getAssignes().stream()
                .filter(StringUtils::isNotBlank)
                .map(String::trim)
                .findFirst()
                .orElse(null);
    }

    @SuppressWarnings("unchecked")
    private void appendVendorRemapHistory(
            Map<String, Object> details,
            String previousVendorOrgId,
            String newVendorOrgId,
            String newVendorUserUuid,
            RequestInfo requestInfo
    ) {
        List<Map<String, Object>> history = new ArrayList<>();
        Object existingHistory = details.get(LIVELIHOOD_VENDOR_REMAP_HISTORY_DETAIL_KEY);
        if (existingHistory instanceof List<?> list) {
            for (Object entry : list) {
                if (entry instanceof Map<?, ?> map) {
                    history.add(new HashMap<>((Map<String, Object>) map));
                }
            }
        }

        Map<String, Object> entry = new HashMap<>();
        entry.put("previousVendorOrgId", previousVendorOrgId);
        entry.put("newVendorOrgId", newVendorOrgId);
        entry.put("newVendorUserUuid", newVendorUserUuid);
        entry.put("assignedAt", System.currentTimeMillis());
        if (requestInfo != null && requestInfo.getUserInfo() != null) {
            entry.put("assignedBy", requestInfo.getUserInfo().getUuid());
        }
        history.add(entry);
        details.put(LIVELIHOOD_VENDOR_REMAP_HISTORY_DETAIL_KEY, history);
    }
}
