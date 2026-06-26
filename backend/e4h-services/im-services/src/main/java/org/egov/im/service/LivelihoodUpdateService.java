package org.egov.im.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.User;
import org.egov.im.util.LivelihoodVendorScopeService;
import org.egov.im.web.models.Document;
import org.egov.im.web.models.Incident;
import org.egov.im.web.models.IncidentRequest;
import org.egov.im.web.models.Workflow;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

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

    private final LivelihoodVendorScopeService livelihoodVendorScopeService;
    private final WorkflowService workflowService;
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
            case "DECLINE" -> validateDecline(request, currentStatus);
            case "REOPEN" -> validateReopen(request, existingIncident, requestInfo);
            case "ASSIGN_VENDOR" -> validateAssignVendor(request, currentStatus);
            default -> { }
        }
    }

    public void prepareUpdate(IncidentRequest request) {
        if (request == null || request.getWorkflow() == null || request.getIncident() == null) {
            return;
        }
        String action = normalizeAction(request.getWorkflow().getAction());
        if (!LIVELIHOOD_WF_OUT_OF_WARRANTY.equals(action)) {
            return;
        }

        Map<String, Object> details = toMutableMap(request.getIncident().getAdditionalDetail());
        details.put(LIVELIHOOD_OOW_ENTERED_AT_DETAIL_KEY, System.currentTimeMillis());

        Workflow workflow = request.getWorkflow();
        if (!CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            Map<String, Object> quotation = new HashMap<>();
            Document primaryDoc = workflow.getVerificationDocuments().get(0);
            if (primaryDoc != null && StringUtils.isNotBlank(primaryDoc.getFileStoreId())) {
                quotation.put("fileStoreId", primaryDoc.getFileStoreId());
            }
            if (StringUtils.isNotBlank(workflow.getComments())) {
                quotation.put("details", workflow.getComments());
            }
            details.put(LIVELIHOOD_OOW_QUOTATION_DETAIL_KEY, quotation);
        }
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
        Workflow workflow = request.getWorkflow();
        if (CollectionUtils.isEmpty(workflow.getVerificationDocuments())) {
            throw new CustomException("QUOTATION_REQUIRED",
                    "Mandatory quotation document (verificationDocuments with fileStoreId) is required for OUT_OF_WARRANTY");
        }
        boolean hasFile = workflow.getVerificationDocuments().stream()
                .anyMatch(doc -> doc != null && StringUtils.isNotBlank(doc.getFileStoreId()));
        if (!hasFile) {
            throw new CustomException("QUOTATION_REQUIRED",
                    "Mandatory quotation document must include a fileStoreId");
        }
    }

    private void validateDecline(IncidentRequest request, String currentStatus) {
        if (!LIVELIHOOD_OUT_OF_WARRANTY_PENDING_VENDOR.equals(currentStatus)) {
            throw new CustomException("INVALID_ACTION", "DECLINE is only allowed from OUT_OF_WARRANTY_PENDING_VENDOR");
        }
        requireComment(request.getWorkflow(), "DECLINE requires a mandatory comment");
    }

    private void validateAssignVendor(IncidentRequest request, String currentStatus) {
        if (!LIVELIHOOD_OUT_OF_SCOPE_PENDING_POC.equals(currentStatus)) {
            throw new CustomException("INVALID_ACTION",
                    "ASSIGN_VENDOR is only allowed from OUT_OF_SCOPE_PENDING_POC");
        }
        if (request.getWorkflow() == null || CollectionUtils.isEmpty(request.getWorkflow().getAssignes())) {
            throw new CustomException("ASSIGNEE_REQUIRED",
                    "ASSIGN_VENDOR requires workflow.assignes with the target vendor user uuid");
        }
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
}
