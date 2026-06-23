package org.egov.im.util;

import com.jayway.jsonpath.JsonPath;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.im.repository.ServiceRequestRepository;
import org.egov.im.web.models.RequestInfoWrapper;
import org.egov.im.web.models.RequestSearchCriteria;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import static org.egov.im.util.IMConstants.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LivelihoodPocScopeService {

    private final HRMSUtil hrmsUtil;
    private final ServiceRequestRepository repository;
    private final LivelihoodTenantUtil livelihoodTenantUtil;

    public boolean isPocUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> ROLE_LIVELIHOOD_POC.equalsIgnoreCase(code));
    }

    public List<String> getAllowedStateBoundaryCodes(RequestInfo requestInfo, String tenantId) {
        return resolveActiveJurisdictionBoundaries(requestInfo, tenantId).stream()
                .map(this::toStateBoundaryCode)
                .filter(StringUtils::isNotBlank)
                .distinct()
                .collect(Collectors.toList());
    }

    public List<String> getAllowedStateCodes(RequestInfo requestInfo, String tenantId) {
        return getAllowedStateBoundaryCodes(requestInfo, tenantId).stream()
                .map(this::extractStateCode)
                .filter(StringUtils::isNotBlank)
                .distinct()
                .collect(Collectors.toList());
    }

    public List<String> toBoundaryPrefixes(List<String> stateBoundaryCodes) {
        if (CollectionUtils.isEmpty(stateBoundaryCodes)) {
            return Collections.emptyList();
        }
        return stateBoundaryCodes.stream()
                .map(code -> toStateBoundaryCode(code).toLowerCase(Locale.ROOT) + "_%")
                .distinct()
                .collect(Collectors.toList());
    }

    public void assertBoundaryInScope(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (!shouldEnforceScope(requestInfo, tenantId)) {
            return;
        }
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
        if (!isBoundaryInScope(requestInfo, tenantId, boundaryCode)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
    }

    public boolean isBoundaryInScope(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (!shouldEnforceScope(requestInfo, tenantId) || StringUtils.isBlank(boundaryCode)) {
            return true;
        }
        String normalizedBoundary = boundaryCode.trim().toLowerCase(Locale.ROOT);
        return getAllowedStateBoundaryCodes(requestInfo, tenantId).stream()
                .map(code -> toStateBoundaryCode(code).toLowerCase(Locale.ROOT))
                .anyMatch(stateBoundary -> normalizedBoundary.startsWith(stateBoundary + "_")
                        || normalizedBoundary.equals(stateBoundary));
    }

    public void applySearchScope(RequestInfo requestInfo, RequestSearchCriteria criteria) {
        if (!shouldEnforceScope(requestInfo, criteria.getTenantId())) {
            return;
        }

        List<String> allowedStateBoundaries = getAllowedStateBoundaryCodes(requestInfo, criteria.getTenantId());
        if (CollectionUtils.isEmpty(allowedStateBoundaries)) {
            throw new CustomException(POC_JURISDICTION_MISSING_CODE, POC_JURISDICTION_MISSING_MSG);
        }

        if (StringUtils.isNotBlank(criteria.getBoundaryCode())) {
            assertBoundaryInScope(requestInfo, criteria.getTenantId(), criteria.getBoundaryCode());
            return;
        }

        if (StringUtils.isNotBlank(criteria.getFacilityState())) {
            assertFacilityStateAllowed(criteria.getFacilityState(), allowedStateBoundaries);
            criteria.setBoundaryCodePrefixes(
                    toBoundaryPrefixes(List.of(normalizeFacilityState(criteria.getFacilityState())))
            );
            return;
        }

        if (!CollectionUtils.isEmpty(criteria.getBoundaryCodePrefixes())) {
            return;
        }

        criteria.setBoundaryCodePrefixes(toBoundaryPrefixes(allowedStateBoundaries));
    }

    private void assertFacilityStateAllowed(String requestedState, List<String> allowedStateBoundaries) {
        String normalized = normalizeFacilityState(requestedState);
        String requestedStateCode = extractStateCode(normalized);
        Set<String> allowedCodes = allowedStateBoundaries.stream()
                .map(this::extractStateCode)
                .collect(Collectors.toSet());
        if (!allowedCodes.contains(requestedStateCode)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
    }

    private boolean shouldEnforceScope(RequestInfo requestInfo, String tenantId) {
        return livelihoodTenantUtil.isLivelihood(tenantId) && isPocUser(requestInfo);
    }

    @SuppressWarnings("unchecked")
    private List<String> resolveActiveJurisdictionBoundaries(RequestInfo requestInfo, String tenantId) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || StringUtils.isBlank(requestInfo.getUserInfo().getUuid())) {
            return Collections.emptyList();
        }

        StringBuilder hrmsUrl = hrmsUtil.getHRMSURI(
                List.of(requestInfo.getUserInfo().getUuid()),
                tenantId,
                ROLE_LIVELIHOOD_POC,
                null
        );
        RequestInfoWrapper wrapper = RequestInfoWrapper.builder().requestInfo(requestInfo).build();
        Object response = repository.fetchResult(hrmsUrl, wrapper);
        if (response == null) {
            return Collections.emptyList();
        }

        try {
            List<Object> boundaries = JsonPath.read(response, "$.Employees[0].jurisdictions[?(@.isActive==true)].boundary");
            if (CollectionUtils.isEmpty(boundaries)) {
                boundaries = JsonPath.read(response, "$.Employees[0].jurisdictions[*].boundary");
            }
            if (CollectionUtils.isEmpty(boundaries)) {
                return Collections.emptyList();
            }
            Set<String> unique = new LinkedHashSet<>();
            for (Object boundary : boundaries) {
                if (boundary != null && StringUtils.isNotBlank(String.valueOf(boundary))) {
                    unique.add(String.valueOf(boundary).trim());
                }
            }
            return new ArrayList<>(unique);
        } catch (Exception e) {
            log.error("Failed to resolve POC jurisdictions from HRMS for user={}",
                    requestInfo.getUserInfo().getUuid(), e);
            throw new CustomException("HRMS_JURISDICTION_ERROR", "Failed to resolve POC state jurisdiction from HRMS");
        }
    }

    private String toStateBoundaryCode(String boundary) {
        return hrmsUtil.resolveBoundaryForHrmsRole(ROLE_LIVELIHOOD_POC, boundary);
    }

    private String normalizeFacilityState(String facilityState) {
        if (StringUtils.isBlank(facilityState)) {
            return facilityState;
        }
        String trimmed = facilityState.trim();
        if (trimmed.contains("_")) {
            return trimmed;
        }
        return "India_" + trimmed;
    }

    private String extractStateCode(String stateBoundaryCode) {
        List<String> segments = splitSegments(stateBoundaryCode);
        if (segments.size() < 2) {
            return stateBoundaryCode;
        }
        return segments.get(1);
    }

    private List<String> splitSegments(String value) {
        if (StringUtils.isBlank(value)) {
            return Collections.emptyList();
        }
        return List.of(value.split("_")).stream()
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toList());
    }
}
