package org.egov.asset.util;

import com.jayway.jsonpath.JsonPath;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.egov.asset.config.Configuration;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.AssetSearchRequest;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.contract.request.Role;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class LivelihoodPocScopeService {

    private static final String ROLE_LIVELIHOOD_POC = "LIVELIHOOD_POC";
    private static final String POC_ACCESS_DENIED_CODE = "POC_ACCESS_DENIED";
    private static final String POC_ACCESS_DENIED_MSG =
            "Access denied: resource is outside your assigned state jurisdiction";
    private static final String POC_JURISDICTION_MISSING_CODE = "POC_JURISDICTION_MISSING";
    private static final String POC_JURISDICTION_MISSING_MSG =
            "LIVELIHOOD_POC user has no active state jurisdiction configured in HRMS";

    private final ServiceRequestRepository serviceRequestRepository;
    private final Configuration configuration;

    public void applyAssetSearchScope(AssetSearchRequest searchRequest, Asset asset) {
        if (searchRequest == null || searchRequest.getRequestInfo() == null || asset == null) {
            return;
        }
        if (!isLivelihoodTenant(asset.getTenantId()) || !isPocUser(searchRequest.getRequestInfo())) {
            return;
        }

        List<String> allowedStateBoundaries = getAllowedStateBoundaryCodes(
                searchRequest.getRequestInfo(),
                asset.getTenantId()
        );
        if (CollectionUtils.isEmpty(allowedStateBoundaries)) {
            throw new CustomException(POC_JURISDICTION_MISSING_CODE, POC_JURISDICTION_MISSING_MSG);
        }

        if (StringUtils.isNotBlank(asset.getBoundaryCode())) {
            assertBoundaryInScope(searchRequest.getRequestInfo(), asset.getTenantId(), asset.getBoundaryCode());
            return;
        }

        asset.setBoundaryCodePrefixes(toBoundaryPrefixes(allowedStateBoundaries));
    }

    public void assertAssetInScope(RequestInfo requestInfo, String tenantId, Asset asset) {
        if (!isLivelihoodTenant(tenantId) || !isPocUser(requestInfo) || asset == null) {
            return;
        }
        assertBoundaryInScope(requestInfo, tenantId, asset.getBoundaryCode());
    }

    public void assertBoundaryInScope(RequestInfo requestInfo, String tenantId, String boundaryCode) {
        if (!isLivelihoodTenant(tenantId) || !isPocUser(requestInfo)) {
            return;
        }
        if (StringUtils.isBlank(boundaryCode)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
        List<String> allowed = getAllowedStateBoundaryCodes(requestInfo, tenantId);
        if (CollectionUtils.isEmpty(allowed) || !matchesAnyStateBoundary(boundaryCode, allowed)) {
            throw new CustomException(POC_ACCESS_DENIED_CODE, POC_ACCESS_DENIED_MSG);
        }
    }

    public boolean isPocUser(RequestInfo requestInfo) {
        if (requestInfo == null || requestInfo.getUserInfo() == null
                || CollectionUtils.isEmpty(requestInfo.getUserInfo().getRoles())) {
            return false;
        }
        return requestInfo.getUserInfo().getRoles().stream()
                .map(Role::getCode)
                .anyMatch(code -> ROLE_LIVELIHOOD_POC.equalsIgnoreCase(code));
    }

    private boolean isLivelihoodTenant(String tenantId) {
        return tenantId != null && tenantId.toLowerCase(Locale.ROOT).startsWith("livelihood");
    }

    private List<String> getAllowedStateBoundaryCodes(RequestInfo requestInfo, String tenantId) {
        if (requestInfo.getUserInfo() == null || StringUtils.isBlank(requestInfo.getUserInfo().getUuid())) {
            return Collections.emptyList();
        }

        String url = configuration.getHrmsHost() + configuration.getHrmsEndPoint()
                + "?tenantId=" + tenantId
                + "&uuids=" + requestInfo.getUserInfo().getUuid()
                + "&roles=" + ROLE_LIVELIHOOD_POC
                + "&isActive=true";

        Map<String, Object> body = new HashMap<>();
        body.put("RequestInfo", requestInfo);

        Object response = serviceRequestRepository.fetchResult(new StringBuilder(url), body, Map.class);
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
                    unique.add(toStateBoundaryCode(String.valueOf(boundary).trim()));
                }
            }
            return new ArrayList<>(unique);
        } catch (Exception e) {
            log.error("Failed to resolve POC jurisdictions from HRMS", e);
            throw new CustomException("HRMS_JURISDICTION_ERROR", "Failed to resolve POC state jurisdiction from HRMS");
        }
    }

    private List<String> toBoundaryPrefixes(List<String> stateBoundaryCodes) {
        return stateBoundaryCodes.stream()
                .map(code -> toStateBoundaryCode(code).toLowerCase(Locale.ROOT) + "_%")
                .distinct()
                .collect(Collectors.toList());
    }

    private boolean matchesAnyStateBoundary(String boundaryCode, List<String> allowedStateBoundaries) {
        String normalizedBoundary = boundaryCode.trim().toLowerCase(Locale.ROOT);
        return allowedStateBoundaries.stream()
                .map(code -> toStateBoundaryCode(code).toLowerCase(Locale.ROOT))
                .anyMatch(stateBoundary -> normalizedBoundary.startsWith(stateBoundary + "_")
                        || normalizedBoundary.equals(stateBoundary));
    }

    private String toStateBoundaryCode(String boundary) {
        if (StringUtils.isBlank(boundary)) {
            return "";
        }
        String normalized = boundary.trim().replace('.', '_');
        String[] segments = normalized.split("_");
        if (segments.length >= 2) {
            return segments[0] + "_" + segments[1];
        }
        return normalized;
    }
}
