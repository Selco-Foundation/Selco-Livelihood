package org.egov.im.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.web.models.IncidentWrapper;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.im.web.models.Workflow;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import static org.egov.im.util.IMConstants.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class LivelihoodVendorScopeService {

    private final LivelihoodTenantUtil livelihoodTenantUtil;
    private final VendorRegistryUtil vendorRegistryUtil;
    private final AssetRegistryUtil assetRegistryUtil;

    public boolean isVendorUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .filter(Objects::nonNull)
                .anyMatch(code -> ROLE_LIVELIHOOD_VENDOR.equalsIgnoreCase(code)
                        || ROLE_COMPLAINT_RESOLVER.equalsIgnoreCase(code));
    }

    public boolean shouldEnforceVendorScope(RequestInfo requestInfo, String tenantId) {
        return livelihoodTenantUtil.isLivelihood(tenantId) && isVendorUser(requestInfo);
    }

    /**
     * Scope vendor search to all tickets on assets mapped to the vendor organisation,
     * regardless of current workflow assignee / status (RESOLVED, OOS, etc.).
     */
    public void applySearchScope(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        if (!shouldEnforceVendorScope(requestInfo, criteria.getTenantId())) {
            return;
        }
        if (requestInfo.getUserInfo() == null || StringUtils.isBlank(requestInfo.getUserInfo().getUuid())) {
            throw new CustomException(VENDOR_ACCESS_DENIED_CODE, VENDOR_ACCESS_DENIED_MSG);
        }
        String userUuid = requestInfo.getUserInfo().getUuid();
        Set<String> vendorKeys = vendorRegistryUtil.resolveVendorOrgKeysForUser(
                requestInfo, criteria.getTenantId(), userUuid);
        Set<String> assetIds = assetRegistryUtil.searchAssetIdsByVendorKeys(
                requestInfo, criteria.getTenantId(), vendorKeys);
        criteria.setAssetIds(assetIds);
        criteria.setAssigneeUserId(null);
        log.info("Vendor search scoped to {} mapped asset(s) for user={}", assetIds.size(), userUuid);
    }

    public boolean allowsVendorSearchWithoutExtraParams(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        return shouldEnforceVendorScope(requestInfo, criteria.getTenantId())
                && StringUtils.isNotBlank(criteria.getTenantId());
    }

    public void assertAssignedToVendor(RequestInfo requestInfo, String tenantId, List<String> currentAssignees) {
        if (!shouldEnforceVendorScope(requestInfo, tenantId)) {
            return;
        }
        String userUuid = requestInfo.getUserInfo().getUuid();
        if (StringUtils.isBlank(userUuid) || CollectionUtils.isEmpty(currentAssignees)) {
            throw new CustomException(VENDOR_ACCESS_DENIED_CODE, VENDOR_ACCESS_DENIED_MSG);
        }
        boolean assigned = currentAssignees.stream()
                .filter(StringUtils::isNotBlank)
                .anyMatch(uuid -> uuid.equalsIgnoreCase(userUuid));
        if (!assigned) {
            throw new CustomException(VENDOR_ACCESS_DENIED_CODE, VENDOR_ACCESS_DENIED_MSG);
        }
    }

    public List<IncidentWrapper> filterByAssignee(List<IncidentWrapper> wrappers, String assigneeUserId) {
        if (StringUtils.isBlank(assigneeUserId) || CollectionUtils.isEmpty(wrappers)) {
            return wrappers;
        }
        return wrappers.stream()
                .filter(wrapper -> isAssignedTo(wrapper, assigneeUserId))
                .collect(Collectors.toList());
    }

    public List<IncidentWrapper> filterByMappedAssets(List<IncidentWrapper> wrappers, Set<String> assetIds) {
        if (assetIds == null || CollectionUtils.isEmpty(wrappers)) {
            return wrappers;
        }
        if (assetIds.isEmpty()) {
            return Collections.emptyList();
        }
        return wrappers.stream()
                .filter(wrapper -> wrapper != null
                        && wrapper.getIncident() != null
                        && StringUtils.isNotBlank(wrapper.getIncident().getAssetId())
                        && assetIds.contains(wrapper.getIncident().getAssetId()))
                .collect(Collectors.toList());
    }

    private boolean isAssignedTo(IncidentWrapper wrapper, String assigneeUserId) {
        if (wrapper == null || wrapper.getWorkflow() == null) {
            return false;
        }
        Workflow workflow = wrapper.getWorkflow();
        if (CollectionUtils.isEmpty(workflow.getAssignes())) {
            return false;
        }
        return workflow.getAssignes().stream()
                .filter(StringUtils::isNotBlank)
                .anyMatch(uuid -> uuid.equalsIgnoreCase(assigneeUserId));
    }

    public boolean isVendorAction(String action) {
        if (StringUtils.isBlank(action)) {
            return false;
        }
        String normalized = action.trim().toUpperCase(Locale.ROOT);
        return IM_WF_RESOLVE.equals(normalized)
                || LIVELIHOOD_WF_OUT_OF_SCOPE.equals(normalized)
                || LIVELIHOOD_WF_OUT_OF_WARRANTY.equals(normalized)
                || LIVELIHOOD_WF_REVISE_QUOTATION.equals(normalized)
                || LIVELIHOOD_WF_DECLINE.equals(normalized);
    }

    public List<String> emptyIfNull(List<String> assignees) {
        return assignees == null ? Collections.emptyList() : assignees;
    }
}
